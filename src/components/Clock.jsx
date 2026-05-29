// ---------------------------------------------------------------------------
// Clock — SVG analog clock with animated second hand
//
// SVG coordinate system: 0° is at the top (12 o'clock).
// SVG rotations pivot around the center of the viewBox (100, 100).
// ---------------------------------------------------------------------------

const CX = 100;   // viewBox center X
const CY = 100;   // viewBox center Y
const R = 88;     // clock face radius

// Degree positions of the 12 hour markers (every 30°)
const HOUR_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

// Degree positions of the 60 minute tick marks
const MINUTE_ANGLES = Array.from({ length: 60 }, (_, i) => i * 6);

function polarToCartesian(cx, cy, r, angleDeg) {
  // SVG angles: 0 = top, increasing clockwise
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

export function Clock({ angle, totalRevolutions, size = 240, showMirror = false }) {
  // Each game revolution advances the minute hand 6° (60 revs = full circle).
  // The fractional revolution (angle/360) gives smooth sub-minute movement.
  const minuteAngle = ((totalRevolutions % 60) + angle / 360) * 6;

  // Each game revolution advances the hour hand 0.5° (720 revs = full circle).
  const hourAngle = ((totalRevolutions % 720) + angle / 360) * 0.5;
  return (
    <div className="clock-container relative flex items-center justify-center" style={{ userSelect: 'none' }}>
      {/* Outer ambient glow ring */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 20,
          height: size + 20,
          background:
            'radial-gradient(circle, rgba(124,111,247,0.12) 0%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        style={{ cursor: 'pointer' }}
        aria-label="Analog clock"
        style={{ filter: 'drop-shadow(0 0 18px rgba(124,111,247,0.25))' }}
      >
        {/* SVG defs: radial gradient for the face, glow filter */}
        <defs>
          <radialGradient id="faceGradient" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0d0d1a" />
          </radialGradient>

          <filter id="handGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="accentGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

        </defs>

        {/* Clock face */}
        <circle cx={CX} cy={CY} r={R} fill="url(#faceGradient)" />

        {/* Outer rim — double ring for depth */}
        <circle
          cx={CX} cy={CY} r={R}
          fill="none"
          stroke="#2a2a4a"
          strokeWidth={2.5}
        />
        <circle
          cx={CX} cy={CY} r={R - 3}
          fill="none"
          stroke="#3d3d6b"
          strokeWidth={0.5}
          opacity={0.5}
        />

        {/* Minute tick marks (subtle) */}
        {MINUTE_ANGLES.map((deg) => {
          const inner = polarToCartesian(CX, CY, R - 7, deg);
          const outer = polarToCartesian(CX, CY, R - 3, deg);
          return (
            <line
              key={`min-${deg}`}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#6a6aaa"
              strokeWidth={0.6}
              strokeLinecap="round"
            />
          );
        })}

        {/* Hour markers */}
        {HOUR_ANGLES.map((deg) => {
          const inner = polarToCartesian(CX, CY, R - 14, deg);
          const outer = polarToCartesian(CX, CY, R - 3, deg);
          const labelPos = polarToCartesian(CX, CY, R - 22, deg);
          const hourNum = deg === 0 ? 12 : deg / 30;
          return (
            <g key={`hour-${deg}`}>
              <line
                x1={inner.x} y1={inner.y}
                x2={outer.x} y2={outer.y}
                stroke="#8888cc"
                strokeWidth={2}
                strokeLinecap="round"
              />
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#9898cc"
                fontSize={7}
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {hourNum}
              </text>
            </g>
          );
        })}

        {/* Hour hand */}
        <g transform={`rotate(${hourAngle}, ${CX}, ${CY})`}>
          <line
            x1={CX} y1={CY}
            x2={CX} y2={CY - 44}
            stroke="#c8c0ff"
            strokeWidth={3.5}
            strokeLinecap="round"
          />
        </g>

        {/* Minute hand */}
        <g transform={`rotate(${minuteAngle}, ${CX}, ${CY})`}>
          <line
            x1={CX} y1={CY}
            x2={CX} y2={CY - 62}
            stroke="#a89fff"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </g>

        {/* Second hand */}
        <g transform={`rotate(${angle}, ${CX}, ${CY})`}>
          <line
            x1={CX} y1={CY}
            x2={CX} y2={CY - 72}
            stroke="#7c6ff7"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        </g>

        {/* Mirror hand — backward-moving second hand (Mirror Clocks prestige) */}
        {showMirror && (
          <g transform={`rotate(${(360 - angle) % 360}, ${CX}, ${CY})`}>
            <line
              x1={CX} y1={CY}
              x2={CX} y2={CY - 72}
              stroke="#e879f9"
              strokeWidth={1.5}
              strokeLinecap="round"
              opacity={0.75}
            />
          </g>
        )}

        {/* Center pivot — layered for glow effect */}
        <circle cx={CX} cy={CY} r={5} fill="#1a1a2e" />
        <circle
          cx={CX} cy={CY} r={3.5}
          fill="#7c6ff7"
          filter="url(#accentGlow)"
        />
        <circle cx={CX} cy={CY} r={2} fill="#c8c0ff" />
      </svg>
    </div>
  );
}
