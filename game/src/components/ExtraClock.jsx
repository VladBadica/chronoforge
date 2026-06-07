// ExtraClock — minimalist orbiting-dot clock for the extra (non-TE) clocks.
// No face, no tick marks — just a glowing ring track, a thin arm, and a dot
// with a short comet trail showing direction of travel.
// Click to toggle the clock on/off; stopped clocks drain no TE but earn no bonus.
//
// The center pivot doubles as a glyph identifying what the clock's
// accumulated bonus does: a forward arrow for speed, a diamond for TE,
// a containment ring for entropy reduction.

const CX = 100;
const CY = 100;
const R  = 82;

const EFFECT_DESCRIPTIONS = {
  speed:   'Speeds up the main clock',
  energy:  'Adds bonus Time Energy per main-clock revolution',
  entropy: 'Reduces Time Entropy',
};

// Short form shown as a persistent label above the drain rate.
const EFFECT_LABELS = {
  speed:   '+Speed/rev',
  energy:  '+TE/rev',
  entropy: '−Entropy/rev',
};

function polarToCartesian(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

function PivotGlyph({ kind, color, opacity }) {
  switch (kind) {
    case 'speed':
      return <path d={`M ${CX - 2.5} ${CY - 3} L ${CX + 3} ${CY} L ${CX - 2.5} ${CY + 3} Z`} fill={color} opacity={opacity} />;
    case 'energy':
      return <path d={`M ${CX} ${CY - 3.5} L ${CX + 3.5} ${CY} L ${CX} ${CY + 3.5} L ${CX - 3.5} ${CY} Z`} fill={color} opacity={opacity} />;
    case 'entropy':
      return <circle cx={CX} cy={CY} r={3} fill="none" stroke={color} strokeWidth={1.2} opacity={opacity} />;
    default:
      return <circle cx={CX} cy={CY} r={2.5} fill={color} opacity={opacity * 0.75} />;
  }
}

export function ExtraClock({ angle, size = 160, running = true, onClick, maintenanceCost = 0, kind = null, effectValue = null }) {
  const dot = polarToCartesian(R, angle);
  const dotColor  = running ? '#4dd0e1' : '#556';
  const trackGlow = running ? 'rgba(77,208,225,0.18)' : 'rgba(85,85,102,0.15)';
  const armColor  = running ? 'rgba(77,208,225,0.22)' : 'rgba(85,85,102,0.15)';
  const ambientColor = running
    ? 'radial-gradient(circle, rgba(77,208,225,0.09) 0%, transparent 70%)'
    : 'radial-gradient(circle, rgba(85,85,102,0.05) 0%, transparent 70%)';

  const drainLabel = maintenanceCost > 0
    ? `${maintenanceCost >= 1 ? maintenanceCost.toFixed(1) : maintenanceCost.toFixed(2)} TE/s`
    : null;

  const effectDescription = EFFECT_DESCRIPTIONS[kind];
  const effectLabel = EFFECT_LABELS[kind];
  const tooltipLines = [
    effectDescription && effectValue ? `${effectDescription} (${effectValue})` : effectDescription,
    running ? 'Click to pause' : 'Click to resume',
  ].filter(Boolean);

  return (
    <div
      className="relative flex flex-row items-center"
      style={{ userSelect: 'none', cursor: 'pointer' }}
      onClick={onClick}
      title={tooltipLines.join(' — ')}
    >
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 16, height: size + 16,
          background: ambientColor,
          filter: 'blur(14px)',
        }}
      />

      <svg viewBox="0 0 200 200" width={size} height={size} aria-label="Extra clock"
        style={{ opacity: running ? 1 : 0.45, transition: 'opacity 0.3s ease' }}>
        <defs>
          <filter id="dotGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0d1e22" strokeWidth={6} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={trackGlow} strokeWidth={3} />

        {/* Arm from center to dot */}
        <line x1={CX} y1={CY} x2={dot.x} y2={dot.y}
          stroke={armColor} strokeWidth={0.8} strokeLinecap="round" />

        {/* Comet trail */}
        {running && [28, 18, 9].map((offset, i) => {
          const t = polarToCartesian(R, angle - offset);
          return (
            <circle key={i} cx={t.x} cy={t.y}
              r={2.5 - i * 0.6}
              fill="#4dd0e1"
              opacity={0.12 + i * 0.08}
            />
          );
        })}

        {/* Main orbiting dot */}
        <circle cx={dot.x} cy={dot.y} r={4.5}
          fill={dotColor} filter={running ? 'url(#dotGlow)' : undefined} />

        {/* Pause icon when stopped */}
        {!running && (
          <g>
            <rect x={CX - 8} y={CY - 10} width={5} height={20} rx={2} fill="#778" opacity={0.7} />
            <rect x={CX + 3} y={CY - 10} width={5} height={20} rx={2} fill="#778" opacity={0.7} />
          </g>
        )}

        {/* Center pivot — doubles as a glyph for this clock's effect */}
        <PivotGlyph kind={kind} color={dotColor} opacity={running ? 0.6 : 0.4} />
      </svg>

      {/* Labels — stacked to the right of the clock.
          Fixed minWidth keeps every row the same total width so centering
          the row doesn't shift the clock disc left/right between clocks
          whose effect label text differs in length (e.g. "−Entropy/rev"
          is wider than "+TE/rev"). */}
      {(effectLabel || (running && drainLabel)) && (
        <div className="flex flex-col" style={{ marginLeft: 6, minWidth: 70 }}>
          {effectLabel && (
            <span style={{
              fontSize: 9,
              color: dotColor,
              opacity: running ? 0.7 : 0.45,
              letterSpacing: '0.03em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              {effectLabel}
            </span>
          )}

          {running && drainLabel && (
            <span style={{
              fontSize: 9,
              color: 'rgba(231,76,60,0.75)',
              letterSpacing: '0.03em',
              pointerEvents: 'none',
              whiteSpace: 'nowrap',
            }}>
              -{drainLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
