// Minimal stats strip shown above the clock
import React from 'react';

export function StatsBar({ totalRevolutions, speedMultiplier, isFastTime, fastTimeIsDebuff, isSurge, surgeRemaining }) {
  const fastMult = isFastTime ? (fastTimeIsDebuff ? 0.5 : 1.5) : 1;
  const surgeMult = isSurge ? 5 : 1;
  const effectiveMultiplier = speedMultiplier * fastMult * surgeMult;

  const borderColor = isSurge
    ? 'rgba(168,143,255,0.45)'
    : isFastTime
      ? (fastTimeIsDebuff ? 'rgba(231,76,60,0.35)' : 'rgba(255,200,80,0.35)')
      : 'var(--color-border)';
  const shadowColor = isSurge
    ? '0 0 16px rgba(168,143,255,0.25)'
    : isFastTime
      ? (fastTimeIsDebuff ? '0 0 12px rgba(231,76,60,0.20)' : '0 0 12px rgba(255,200,80,0.15)')
      : 'none';
  const speedColor = isSurge ? '#a88fff' : isFastTime ? (fastTimeIsDebuff ? '#e74c3c' : '#ffc850') : '#9d8fff';
  const speedIcon = isSurge ? '✦ ' : isFastTime ? (fastTimeIsDebuff ? '🔻 ' : '⚡ ') : '';

  return (
    <div
      className="flex items-center gap-6 px-6 py-2 rounded-full text-xs transition-all duration-400"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${borderColor}`,
        color: 'var(--color-muted)',
        boxShadow: isSurge || isFastTime ? shadowColor : 'none',
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
        <span className="font-semibold" style={{ color: speedColor }}>
          {speedIcon}{(effectiveMultiplier * 100).toFixed(0)}%
        </span>
      </span>
      {isSurge && (
        <span className="font-semibold" style={{ color: '#a88fff' }}>
          SURGE {(surgeRemaining / 1000).toFixed(1)}s
        </span>
      )}
    </div>
  );
}
