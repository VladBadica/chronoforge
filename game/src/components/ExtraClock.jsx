// ExtraClock — minimalist orbiting-dot clock for the extra (non-TE) clocks.
// No face, no tick marks — just a glowing ring track, a thin arm, and a dot
// with a short comet trail showing direction of travel.

const CX = 100;
const CY = 100;
const R  = 82;

function polarToCartesian(r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) };
}

export function ExtraClock({ angle, size = 160 }) {
  const dot = polarToCartesian(R, angle);

  return (
    <div className="relative flex items-center justify-center" style={{ userSelect: 'none' }}>
      {/* Ambient glow */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 16, height: size + 16,
          background: 'radial-gradient(circle, rgba(77,208,225,0.09) 0%, transparent 70%)',
          filter: 'blur(14px)',
        }}
      />

      <svg viewBox="0 0 200 200" width={size} height={size}
        aria-label="Extra clock" style={{ cursor: 'default' }}>
        <defs>
          <filter id="dotGlow" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Track ring — dark structural + faint teal glow */}
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#0d1e22" strokeWidth={6} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(77,208,225,0.18)" strokeWidth={3} />

        {/* Arm from center to dot */}
        <line x1={CX} y1={CY} x2={dot.x} y2={dot.y}
          stroke="rgba(77,208,225,0.22)" strokeWidth={0.8} strokeLinecap="round" />

        {/* Comet trail — 3 fading dots behind the main dot */}
        {[28, 18, 9].map((offset, i) => {
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
          fill="#4dd0e1" filter="url(#dotGlow)" />

        {/* Center pivot */}
        <circle cx={CX} cy={CY} r={2.5} fill="#4dd0e1" opacity={0.45} />
      </svg>
    </div>
  );
}
