function formatNumber(n, fixedDecimals = 2) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(fixedDecimals) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(fixedDecimals) + 'K';
  return n.toFixed(fixedDecimals);
}

export function EnergyDisplay({ energy, energyPerSecond, timeDust = 0 }) {
  return (
    <div className="flex items-start gap-8">

      {/* Time Energy */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-2">
          <span
            className="stat-value text-5xl font-bold tracking-tight"
            style={{ color: 'var(--color-energy)' }}
          >
            {formatNumber(energy)}
          </span>
          <span className="text-lg font-medium" style={{ color: 'var(--color-muted)' }}>
            TE
          </span>
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-muted)' }}
        >
          Time Energy
        </span>
        <div
          className="mt-1 flex items-center gap-1.5 px-3 py-1 rounded-full text-sm"
          style={{
            background: 'rgba(240,192,96,0.08)',
            border: '1px solid rgba(240,192,96,0.15)',
            color: 'rgba(240,192,96,0.75)',
          }}
        >
          <span className="stat-value">{formatNumber(energyPerSecond)}</span>
          <span style={{ color: 'var(--color-muted)' }}>TE/s</span>
        </div>
      </div>

      {/* Time Dust */}
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-baseline gap-2">
          <span
            className="stat-value text-5xl font-bold tracking-tight"
            style={{ color: '#c0b8ff' }}
          >
            {formatNumber(timeDust, 1)}
          </span>
          <span className="text-lg font-medium" style={{ color: 'var(--color-muted)' }}>
            TD
          </span>
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: 'var(--color-muted)' }}
        >
          Time Dust
        </span>
      </div>

    </div>
  );
}
