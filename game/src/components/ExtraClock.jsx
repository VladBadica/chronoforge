// ExtraClock — minimalist orbiting-dot clock for the extra (non-TE) clocks.
// No face, no tick marks — just a glowing ring track, a thin arm, and a dot
// with a short comet trail showing direction of travel.
// Click to toggle the clock on/off; stopped clocks drain no TE but earn no bonus.

const CX = 100;
const CY = 100;
const R  = 82;

function polarToCartesian(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export function ExtraClock({ angle, size = 160, running = true, onClick, maintenanceCost = 0 }) {
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

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ userSelect: 'none', cursor: 'pointer' }}
      onClick={onClick}
      title={running ? 'Click to pause' : 'Click to resume'}
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

        {/* Center pivot */}
        <circle cx={CX} cy={CY} r={2.5} fill={dotColor} opacity={0.45} />
      </svg>

      {/* Drain rate label — shown when running and there is a cost */}
      {running && drainLabel && (
        <span style={{
          fontSize: 9,
          color: 'rgba(231,76,60,0.75)',
          marginTop: -2,
          letterSpacing: '0.03em',
          pointerEvents: 'none',
        }}>
          -{drainLabel}
        </span>
      )}
    </div>
  );
}
