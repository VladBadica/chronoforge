// Minimal stats strip shown above the clock
import React from 'react';

export function StatsBar({ totalRevolutions, speedMultiplier, isFastTime }) {
  const effectiveMultiplier = speedMultiplier * (isFastTime ? 1.5 : 1);

  return (
    <div
      className="flex items-center gap-6 px-6 py-2 rounded-full text-xs transition-all duration-400"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isFastTime ? 'rgba(255,200,80,0.35)' : 'var(--color-border)'}`,
        color: 'var(--color-muted)',
        boxShadow: isFastTime ? '0 0 12px rgba(255,200,80,0.15)' : 'none',
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
        <span
          className="font-semibold"
          style={{ color: isFastTime ? '#ffc850' : '#9d8fff' }}
        >
          {isFastTime && '⚡ '}{(effectiveMultiplier * 100).toFixed(0)}%
        </span>
      </span>
    </div>
  );
}
