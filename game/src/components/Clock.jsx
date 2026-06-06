// ---------------------------------------------------------------------------
// Clock — SVG analog clock with animated second hand
//
// SVG coordinate system: 0° is at the top (12 o'clock).
// SVG rotations pivot around the center of the viewBox (100, 100).
// ---------------------------------------------------------------------------

const CX = 100;
const CY = 100;
const R  = 88;

const HOUR_ANGLES   = Array.from({ length: 12 }, (_, i) => i * 30);
const MINUTE_ANGLES = Array.from({ length: 60 }, (_, i) => i * 6);

// Turbulence warp starts here — very mild, accelerates steeply past 70%.
const WARP_THRESHOLD = 0.40;

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export function Clock({ angle, totalRevolutions, size = 240, showMirror = false, entropy = 0, suppressWarp = false }) {
  const minuteAngle = ((totalRevolutions % 60) + angle / 360) * 6;
  const hourAngle   = ((totalRevolutions % 720) + angle / 360) * 0.5;

  // Power curve: t=0 at 40%, t=1 at 100%. Exponent 2.5 keeps it barely
  // visible from 40-70% (~0-3.5px) then ramps hard above 70% (up to 20px).
  // Suppressed when Temporal Stabilization is purchased.
  const warpScale = !suppressWarp && entropy >= WARP_THRESHOLD
    ? Math.pow((entropy - WARP_THRESHOLD) / (1 - WARP_THRESHOLD), 1.7) * 7
    : 0;

  // Seed shifts with angle so the turbulence crawls as the clock spins.
  // Changes every 6° of rotation → 60 steps per full revolution.
  const warpSeed = Math.floor(angle / 6) % 60;

  return (
    <div className="clock-container relative flex items-center justify-center" style={{ userSelect: 'none' }}>
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: size + 20, height: size + 20,
          background: 'radial-gradient(circle, rgba(124,111,247,0.12) 0%, transparent 70%)',
          filter: 'blur(18px)',
        }}
      />

      <svg
        viewBox="0 0 200 200"
        width={size}
        height={size}
        aria-label="Analog clock"
        style={{ cursor: 'pointer', filter: 'drop-shadow(0 0 18px rgba(124,111,247,0.25))', overflow: 'visible' }}
      >
        <defs>
          <radialGradient id="faceGradient" cx="50%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#1a1a2e" />
            <stop offset="100%" stopColor="#0d0d1a" />
          </radialGradient>
          <filter id="handGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="accentGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          {/* Turbulence warp — active above WARP_THRESHOLD entropy */}
          {warpScale > 0 && (
            <filter id="clockWarp" x="-15%" y="-15%" width="130%" height="130%">
              <feTurbulence
                type="turbulence"
                baseFrequency="0.018 0.022"
                numOctaves="2"
                seed={warpSeed}
                result="noise"
              >
                {/* Continuously shift the frequency so the distortion ripples */}
                <animate
                  attributeName="baseFrequency"
                  values="0.018 0.022; 0.022 0.028; 0.014 0.018; 0.020 0.024; 0.018 0.022"
                  dur="5s"
                  repeatCount="indefinite"
                />
              </feTurbulence>
              <feDisplacementMap
                in="SourceGraphic"
                in2="noise"
                scale={warpScale}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          )}
        </defs>

        {/* Everything inside this group gets the turbulence warp when active */}
        <g filter={warpScale > 0 ? 'url(#clockWarp)' : undefined}>
          {/* Clock face */}
          <circle cx={CX} cy={CY} r={R} fill="url(#faceGradient)" />

          {/* Outer rim */}
          <circle cx={CX} cy={CY} r={R}     fill="none" stroke="#2a2a4a" strokeWidth={2.5} />
          <circle cx={CX} cy={CY} r={R - 3} fill="none" stroke="#3d3d6b" strokeWidth={0.5} opacity={0.5} />

          {/* Minute tick marks */}
          {MINUTE_ANGLES.map((deg) => {
            const inner = polarToCartesian(CX, CY, R - 7, deg);
            const outer = polarToCartesian(CX, CY, R - 3, deg);
            return (
              <line key={`min-${deg}`}
                x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                stroke="#6a6aaa" strokeWidth={0.6} strokeLinecap="round"
              />
            );
          })}

          {/* Hour markers */}
          {HOUR_ANGLES.map((deg) => {
            const inner    = polarToCartesian(CX, CY, R - 14, deg);
            const outer    = polarToCartesian(CX, CY, R - 3,  deg);
            const labelPos = polarToCartesian(CX, CY, R - 22, deg);
            const hourNum  = deg === 0 ? 12 : deg / 30;
            return (
              <g key={`hour-${deg}`}>
                <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
                  stroke="#8888cc" strokeWidth={2} strokeLinecap="round" />
                <text x={labelPos.x} y={labelPos.y}
                  textAnchor="middle" dominantBaseline="middle"
                  fill="#9898cc" fontSize={7}
                  fontFamily="system-ui, sans-serif" fontWeight="600">
                  {hourNum}
                </text>
              </g>
            );
          })}

          {/* Hour hand */}
          <g transform={`rotate(${hourAngle}, ${CX}, ${CY})`}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - 44}
              stroke="#c8c0ff" strokeWidth={3.5} strokeLinecap="round" />
          </g>

          {/* Minute hand */}
          <g transform={`rotate(${minuteAngle}, ${CX}, ${CY})`}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - 62}
              stroke="#a89fff" strokeWidth={2.5} strokeLinecap="round" />
          </g>

          {/* Second hand */}
          <g transform={`rotate(${angle}, ${CX}, ${CY})`}>
            <line x1={CX} y1={CY} x2={CX} y2={CY - 72}
              stroke="#7c6ff7" strokeWidth={1.5} strokeLinecap="round" />
          </g>

          {/* Mirror hand — backward-moving, fractured at two points */}
          {showMirror && (
            <g transform={`rotate(${(360 - angle) % 360}, ${CX}, ${CY})`}>
              <line x1={CX} y1={CY} x2={CX} y2={CY - 30}
                stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
              <g transform={`rotate(4, ${CX}, ${CY - 30})`}>
                <line x1={CX} y1={CY - 34} x2={CX} y2={CY - 52}
                  stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" opacity={0.55} />
                <g transform={`rotate(-4, ${CX}, ${CY - 52})`}>
                  <line x1={CX} y1={CY - 56} x2={CX} y2={CY - 72}
                    stroke="#e879f9" strokeWidth={1.5} strokeLinecap="round" opacity={0.40} />
                </g>
              </g>
            </g>
          )}

          {/* Center pivot */}
          <circle cx={CX} cy={CY} r={5} fill="#1a1a2e" />
          <circle cx={CX} cy={CY} r={3.5} fill="#7c6ff7" filter="url(#accentGlow)" />
          <circle cx={CX} cy={CY} r={2} fill="#c8c0ff" />
        </g>
      </svg>
    </div>
  );
}
