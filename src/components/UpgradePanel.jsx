// Upgrade panel — lists all available upgrades
// Currently only "Accelerate Time" but structured for future upgrades
import React from 'react';

function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return Math.floor(n).toString();
}

function UpgradeCard({ title, description, level, statLabel, statCurrent, statNext, statNextColor, cost, canAfford, onBuy, accentColor, accentGlow }) {
  return (
    <div
      className="flex-1 rounded-xl flex flex-col transition-all duration-200"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${canAfford ? accentColor + '66' : 'var(--color-border)'}`,
        boxShadow: canAfford ? `0 0 20px ${accentGlow}` : 'none',
        padding: '10px',
      }}
    >
      {/* Top: title + level badge always anchored here */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
            {title}
          </div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--color-muted)' }}>
            {description}
          </div>
        </div>
        <div
          className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ background: accentColor + '26', color: statNextColor }}
        >
          Lv.{level}
        </div>
      </div>

      {/* Spacer — pushes bottom group down */}
      <div className="flex-1" />

      {/* Bottom: stat row + buy button */}
      <div className="flex flex-col gap-2 pt-3">
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>
            {statLabel}: <span style={{ color: 'var(--color-text)' }}>{statCurrent}</span>
          </span>
          <span>
            Next: <span style={{ color: statNextColor }}>{statNext}</span>
          </span>
        </div>

        <button
          onClick={onBuy}
          disabled={!canAfford}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: canAfford
              ? `linear-gradient(135deg, ${accentColor}cc, ${accentColor})`
              : 'var(--color-border)',
            color: canAfford ? '#fff' : 'var(--color-muted)',
            cursor: canAfford ? 'pointer' : 'not-allowed',
            border: 'none',
            outline: 'none',
            boxShadow: canAfford ? `0 4px 14px ${accentGlow}` : 'none',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (canAfford) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span style={{ color: 'var(--color-energy)', marginRight: 6 }}>
            {formatNumber(cost)} TE
          </span>
          Buy
        </button>
      </div>
    </div>
  );
}

export function UpgradePanel({
  energy,
  upgradeCost, speedLevel, speedMultiplier, onBuyUpgrade,
  energyUpgradeCost, energyLevel, energyPerRevolution, onBuyEnergyUpgrade,
}) {
  const nextSpeedMultiplier = ((1 + (speedLevel + 1) * 0.10) * 100).toFixed(0);
  const nextEnergyPerRev = (energyPerRevolution + 0.50).toFixed(2);

  return (
    <div className="w-full max-w-sm flex flex-col gap-3">
      <h2
        className="text-xs font-semibold uppercase tracking-widest text-center"
        style={{ color: 'var(--color-muted)' }}
      >
        Upgrades
      </h2>

      <div className="flex gap-3">

        <UpgradeCard
          title="Accelerate Time"
          description="Clock speed +10% per level"
          level={speedLevel}
          statLabel="Speed"
          statCurrent={`${(speedMultiplier * 100).toFixed(0)}%`}
          statNext={`${nextSpeedMultiplier}%`}
          statNextColor="#9d8fff"
          cost={upgradeCost}
          canAfford={energy >= upgradeCost}
          onBuy={onBuyUpgrade}
          accentColor="#7c6ff7"
          accentGlow="rgba(124,111,247,0.08)"
        />

        <UpgradeCard
          title="Improve Time"
          description="+0.5 TE per revolution per level"
          level={energyLevel}
          statLabel="TE/rev"
          statCurrent={energyPerRevolution.toFixed(2)}
          statNext={nextEnergyPerRev}
          statNextColor="#f0c060"
          cost={energyUpgradeCost}
          canAfford={energy >= energyUpgradeCost}
          onBuy={onBuyEnergyUpgrade}
          accentColor="#c0902a"
          accentGlow="rgba(240,192,96,0.10)"
        />

      </div>
    </div>
  );
}
