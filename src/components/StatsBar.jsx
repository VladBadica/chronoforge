// Minimal stats strip shown above the clock
import React from 'react';

export function StatsBar({ totalRevolutions, speedMultiplier }) {
  return (
    <div
      className="flex items-center gap-6 px-6 py-2 rounded-full text-xs"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-muted)',
      }}
    >
      <span>
        Revolutions:{' '}
        <span className="stat-value font-semibold" style={{ color: 'var(--color-text)' }}>
          {totalRevolutions.toLocaleString()}
        </span>
      </span>
      <span style={{ color: 'var(--color-border)' }}>|</span>
      <span>
        Speed:{' '}
        <span className="font-semibold" style={{ color: '#9d8fff' }}>
          {(speedMultiplier * 100).toFixed(0)}%
        </span>
      </span>
    </div>
  );
}
