import React from 'react';

export function PrestigeModal({ timeDust, prestigePoints, canPrestige, onPrestige, onClose }) {
  const ppGain = Math.floor(timeDust);
  const totalAfter = prestigePoints + ppGain;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 p-8"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md flex flex-col gap-6 rounded-2xl p-12"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid rgba(168,143,255,0.3)',
          boxShadow: '0 0 60px rgba(124,111,247,0.2)',
        }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-1">
          <h2
            className="text-2xl font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, #c0b8ff, #7c6ff7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            TEMPORAL PRESTIGE
          </h2>
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
            Transcend the age
          </p>
        </div>

        {/* Explanation */}
        <p className="text-sm text-center leading-relaxed" style={{ color: 'var(--color-muted)' }}>
          Sacrifice your progress to transcend time itself. Prestige resets all clocks, upgrades,
          and Time Energy — but your{' '}
          <span style={{ color: '#c0b8ff' }}>Prestige Points</span> and{' '}
          <span style={{ color: '#c0b8ff' }}>Prestige Upgrades</span> persist across every age.
          Requires <span style={{ color: '#5ecfb0' }}>10 TD</span> to prestige.
        </p>

        {/* Stats */}
        <div
          className="flex justify-between rounded-xl px-6 py-4"
          style={{ background: 'rgba(124,111,247,0.06)', border: '1px solid rgba(124,111,247,0.15)' }}
        >
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Time Dust
            </span>
            <span className="text-xl font-bold" style={{ color: '#5ecfb0' }}>
              {timeDust.toFixed(1)} TD
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              PP Gain
            </span>
            <span className="text-xl font-bold" style={{ color: '#c0b8ff' }}>
              +{ppGain} PP
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
              Total PP
            </span>
            <span className="text-xl font-bold" style={{ color: '#a88fff' }}>
              {totalAfter} PP
            </span>
          </div>
        </div>

        {/* Prestige Upgrades placeholder */}
        <div className="flex flex-col gap-2">
          <h3
            className="text-xs font-semibold uppercase tracking-widest text-center"
            style={{ color: 'var(--color-muted)' }}
          >
            Prestige Upgrades
          </h3>
          <div
            className="rounded-xl py-6 text-center text-xs"
            style={{
              border: '1px dashed var(--color-border)',
              color: 'var(--color-muted)',
            }}
          >
            Coming in a future age…
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-150"
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border)',
              color: 'var(--color-muted)',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-muted)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            Cancel
          </button>

          <button
            onClick={canPrestige ? onPrestige : undefined}
            disabled={!canPrestige}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: canPrestige
                ? 'linear-gradient(135deg, #9d8fffcc, #7c6ff7)'
                : 'var(--color-border)',
              color: canPrestige ? '#fff' : 'var(--color-muted)',
              cursor: canPrestige ? 'pointer' : 'not-allowed',
              border: 'none',
              boxShadow: canPrestige ? '0 4px 20px rgba(124,111,247,0.35)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (canPrestige) e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ✦ Prestige ({ppGain} PP)
          </button>
        </div>
      </div>
    </div>
  );
}
