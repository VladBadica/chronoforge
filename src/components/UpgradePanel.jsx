// Upgrade panel — lists all available upgrades
// Currently only "Accelerate Time" but structured for future upgrades
import React from 'react';

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return Math.floor(n).toString();
}

export function UpgradePanel({ energy, upgradeCost, speedLevel, speedMultiplier, onBuyUpgrade }) {
  const canAfford = energy >= upgradeCost;
  const nextMultiplier = ((1 + (speedLevel + 1) * 0.10) * 100).toFixed(0);

  return (
    <div className="w-full max-w-xs flex flex-col gap-3">
      {/* Section header */}
      <h2
        className="text-xs font-semibold uppercase tracking-widest text-center"
        style={{ color: 'var(--color-muted)' }}
      >
        Upgrades
      </h2>

      {/* Accelerate Time upgrade card */}
      <div
        className="rounded-xl p-4 flex flex-col gap-3 transition-all duration-200"
        style={{
          background: 'var(--color-surface)',
          border: `1px solid ${canAfford ? 'rgba(124,111,247,0.4)' : 'var(--color-border)'}`,
          boxShadow: canAfford ? '0 0 20px rgba(124,111,247,0.08)' : 'none',
        }}
      >
        {/* Title + level badge */}
        <div className="flex items-center justify-between">
          <div>
            <div
              className="font-semibold text-sm"
              style={{ color: 'var(--color-text)' }}
            >
              Accelerate Time
            </div>
            <div
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-muted)' }}
            >
              Clock speed +10% per level
            </div>
          </div>
          <div
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: 'rgba(124,111,247,0.15)',
              color: '#9d8fff',
            }}
          >
            Lv.{speedLevel}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>
            Current: <span style={{ color: 'var(--color-text)' }}>{(speedMultiplier * 100).toFixed(0)}%</span>
          </span>
          <span>
            Next: <span style={{ color: '#9d8fff' }}>{nextMultiplier}%</span>
          </span>
        </div>

        {/* Buy button */}
        <button
          onClick={onBuyUpgrade}
          disabled={!canAfford}
          className="w-full py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: canAfford
              ? 'linear-gradient(135deg, #6b5fe0, #8b7af0)'
              : 'var(--color-border)',
            color: canAfford ? '#fff' : 'var(--color-muted)',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            border: 'none',
            outline: 'none',
            boxShadow: canAfford ? '0 4px 14px rgba(107,95,224,0.35)' : 'none',
            transform: canAfford ? 'translateY(0)' : 'none',
          }}
          onMouseEnter={(e) => {
            if (canAfford) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ color: 'var(--color-energy)', marginRight: 6 }}>
            {formatNumber(upgradeCost)} TE
          </span>
          Buy
        </button>
      </div>
    </div>
  );
}
