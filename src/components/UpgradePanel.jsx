function formatNumber(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'K';
  return Math.floor(n).toString();
}

function UpgradeCard({ title, description, level, statLabel, statCurrent, statNext, statNextColor, cost, canAfford, onBuy, accentColor, accentGlow, maxed = false }) {
  const effectiveCanAfford = canAfford && !maxed;
  return (
    <div
      className="flex-1 rounded-xl flex flex-col transition-all duration-200"
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${effectiveCanAfford ? '#2a9d8f99' : 'var(--color-border)'}`,
        boxShadow: effectiveCanAfford ? '0 0 20px rgba(42,157,143,0.12)' : 'none',
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
            Next: <span style={{ color: statNextColor }}>{maxed ? '—' : statNext}</span>
          </span>
        </div>

        <button
          onClick={onBuy}
          disabled={!effectiveCanAfford}
          className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: effectiveCanAfford
              ? `linear-gradient(135deg, ${accentColor}cc, ${accentColor})`
              : 'var(--color-border)',
            color: effectiveCanAfford ? '#fff' : 'var(--color-muted)',
            cursor: effectiveCanAfford ? 'pointer' : 'not-allowed',
            border: 'none',
            outline: 'none',
            boxShadow: effectiveCanAfford ? `0 4px 14px ${accentGlow}` : 'none',
            transform: 'translateY(0)',
          }}
          onMouseEnter={(e) => {
            if (effectiveCanAfford) e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          {maxed ? 'MAX LEVEL' : (
            <>
              <span style={{ color: 'var(--color-energy)', marginRight: 6 }}>
                {formatNumber(cost)} TE
              </span>
              Buy
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function UpgradePanel({
  energy,
  upgradeCost, speedLevel, speedMultiplier, nextSpeedMultiplier, onBuyUpgrade,
  energyUpgradeCost, energyLevel, energyPerRevolution, nextEnergyPerRevolution, onBuyEnergyUpgrade,
  clockCount, clockAtMax, clock2SpeedBonus, clock3EntropyReduction, clockUpgradeCost, onBuyClockUpgrade,
  boostLevel, boostAtMax, extraClockSpeedFactor, nextExtraClockSpeedFactor, boostUpgradeCost, onBuyBoostUpgrade,
  entropy, nextEntropy, stabilityLevel, stabilityUpgradeCost, onBuyStabilityUpgrade,
}) {

  return (
    <div className="w-full max-w-lg flex flex-col gap-3">
      <h2
        className="text-xs font-semibold uppercase tracking-widest text-center"
        style={{ color: 'var(--color-muted)' }}
      >
        Upgrades
      </h2>

      <div className="grid grid-cols-2 gap-3">

        <UpgradeCard
          title="Accelerate Time"
          description="Clock speed increase"
          level={speedLevel}
          statLabel="Speed"
          statCurrent={`${(speedMultiplier * 100).toFixed(0)}%`}
          statNext={`${(nextSpeedMultiplier * 100).toFixed(0)}%`}
          statNextColor="#5ecfb0"
          cost={upgradeCost}
          canAfford={energy >= upgradeCost}
          onBuy={onBuyUpgrade}
          accentColor="#2a9d8f"
          accentGlow="rgba(42,157,143,0.10)"
        />

        <UpgradeCard
          title="Improve Time"
          description="Increase TE yield"
          level={energyLevel}
          statLabel="TE/rev"
          statCurrent={energyPerRevolution.toFixed(2)}
          statNext={nextEnergyPerRevolution.toFixed(2)}
          statNextColor="#5ecfb0"
          cost={energyUpgradeCost}
          canAfford={energy >= energyUpgradeCost}
          onBuy={onBuyEnergyUpgrade}
          accentColor="#2a9d8f"
          accentGlow="rgba(42,157,143,0.10)"
        />

        <UpgradeCard
          title="Add Clock"
          description={
            clockAtMax
              ? `Clk2 +${(clock2SpeedBonus * 100).toFixed(0)}% spd | Clk3 -${(clock3EntropyReduction * 100).toFixed(0)}% ent`
              : clockCount === 1
                ? 'Clock 2: +10% speed per revolution'
                : 'Clock 3: -1% entropy per revolution'
          }
          level={clockCount - 1}
          statLabel="Clocks"
          statCurrent={String(clockCount)}
          statNext={clockAtMax ? String(clockCount) : String(clockCount + 1)}
          statNextColor="#5ecfb0"
          cost={clockUpgradeCost}
          canAfford={energy >= clockUpgradeCost}
          maxed={clockAtMax}
          onBuy={onBuyClockUpgrade}
          accentColor="#2a9d8f"
          accentGlow="rgba(42,157,143,0.10)"
        />

        <UpgradeCard
          title="Boost Clocks"
          description="Increase base speed to all extra clocks"
          level={boostLevel}
          statLabel="Factor"
          statCurrent={`${(extraClockSpeedFactor * 100).toFixed(0)}%`}
          statNext={`${(nextExtraClockSpeedFactor * 100).toFixed(0)}%`}
          statNextColor="#5ecfb0"
          cost={boostUpgradeCost}
          canAfford={energy >= boostUpgradeCost}
          maxed={boostAtMax}
          onBuy={onBuyBoostUpgrade}
          accentColor="#2a9d8f"
          accentGlow="rgba(42,157,143,0.10)"
        />

        <div className="col-span-2">
          <UpgradeCard
            title="Anchor Time"
            description="Reduce Time Entropy — stabilize the timeline"
            level={stabilityLevel}
            statLabel="Entropy"
            statCurrent={`${(entropy * 100).toFixed(1)}%`}
            statNext={`${(nextEntropy * 100).toFixed(1)}%`}
            statNextColor="#5ecfb0"
            cost={stabilityUpgradeCost}
            canAfford={energy >= stabilityUpgradeCost}
            onBuy={onBuyStabilityUpgrade}
            accentColor="#2a9d8f"
            accentGlow="rgba(42,157,143,0.10)"
          />
        </div>

      </div>
    </div>
  );
}
