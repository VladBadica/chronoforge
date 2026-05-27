import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine.js';
import { useGameStore } from './store/useGameStore.js';
import { Clock } from './components/Clock.jsx';
import { EnergyDisplay } from './components/EnergyDisplay.jsx';
import { UpgradePanel } from './components/UpgradePanel.jsx';
import { StatsBar } from './components/StatsBar.jsx';
import { PrestigeModal } from './components/PrestigeModal.jsx';
import { FAST_TIME_MULTIPLIER, FAST_TIME_DEBUFF_MULTIPLIER } from './game/constants.js';

export default function App() {
  useGameEngine();
  const [showPrestige, setShowPrestige] = useState(false);

  const {
    angle,
    energy,
    energyPerSecond,
    speedLevel,
    speedMultiplier,
    nextSpeedMultiplier,
    upgradeCost,
    energyLevel,
    energyPerRevolution,
    nextEnergyPerRevolution,
    energyUpgradeCost,
    clockCount,
    clockAtMax,
    clock2SpeedBonus,
    clock3EntropyReduction,
    boostLevel,
    boostAtMax,
    timeDust,
    extraClockSpeedFactor,
    nextExtraClockSpeedFactor,
    extraAngles,
    extraRevolutions,
    clockUpgradeCost,
    boostUpgradeCost,
    isFastTime,
    fastTimeIsDebuff,
    isFracture,
    isSurge,
    surgeRemaining,
    totalRevolutions,
    entropy,
    nextEntropy,
    stabilityLevel,
    stabilityUpgradeCost,
    buyUpgrade,
    buyEnergyUpgrade,
    buyClockUpgrade,
    buyBoostUpgrade,
    buyStabilityUpgrade,
    prestigePoints,
    canPrestige,
    prestige,
    prestigeSpeedLevel, prestigeSpeedCost, buyPrestigeSpeed,
    prestigeEnergyLevel, prestigeEnergyCost, buyPrestigeEnergy,
    prestigeClockLevel, prestigeClockCost, buyPrestigeClock,
    prestigeBoostLevel, prestigeBoostCost, buyPrestigeBoost,
    prestigeAnchorLevel, prestigeAnchorCost, buyPrestigeAnchor,
    prestigeMirrorLevel, prestigeMirrorCost, buyPrestigeMirror,
    addSecond,
    resetGame,
    debugAddEnergy,
    debugAddTimeDust,
  } = useGameStore();

  // Scale clocks down as more are added so they all fit comfortably
  const clockSize = clockCount === 1 ? 220 : clockCount === 2 ? 180 : 140;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8"
      style={{ background: 'var(--color-bg)', paddingTop: '3rem', paddingBottom: '3rem' }}
    >
      <header className="flex flex-col items-center gap-1">
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #a89fff, #7c6ff7)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          CHRONOFORGE
        </h1>
        <p
          className="text-xs tracking-widest uppercase"
          style={{ color: 'var(--color-muted)' }}
        >
          Forge time itself
        </p>
      </header>

      <StatsBar totalRevolutions={totalRevolutions} speedMultiplier={speedMultiplier} isFastTime={isFastTime} fastTimeIsDebuff={fastTimeIsDebuff} fastTimeMultiplier={FAST_TIME_MULTIPLIER} fastTimeDebuffMultiplier={FAST_TIME_DEBUFF_MULTIPLIER} isSurge={isSurge} surgeRemaining={surgeRemaining} />

      <div className="w-full max-w-lg flex flex-col gap-1">
        <div className="flex justify-between text-xs" style={{ color: 'var(--color-muted)' }}>
          <span>Time Entropy</span>
          <span style={{ color: entropy > 0.7 ? '#e74c3c' : entropy > 0.4 ? '#e67e22' : '#5ecfb0' }}>
            {(entropy * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full rounded-full overflow-hidden" style={{ height: 6, background: 'var(--color-border)' }}>
          <div
            style={{
              height: '100%',
              width: `${entropy * 100}%`,
              background: 'linear-gradient(90deg, #5ecfb0 0%, #e67e22 40%, #e74c3c 70%, #c0392b 100%)',
              backgroundSize: entropy > 0 ? `${(100 / entropy).toFixed(1)}% 100%` : '100% 100%',
              boxShadow: entropy > 0.5 ? `0 0 8px ${entropy > 0.7 ? 'rgba(231,76,60,0.5)' : 'rgba(230,126,34,0.5)'}` : 'none',
              transition: 'width 0.3s ease, box-shadow 0.3s ease',
              borderRadius: 9999,
            }}
          />
        </div>
      </div>

      <div
        className="flex items-center justify-center gap-4 flex-wrap"
        onClick={addSecond}
        style={{
          cursor: 'pointer',
          filter: isFracture
            ? 'drop-shadow(0 0 32px rgba(231,76,60,0.9))'
            : isSurge
              ? 'drop-shadow(0 0 40px rgba(168,143,255,0.85))'
              : isFastTime
                ? (fastTimeIsDebuff ? 'drop-shadow(0 0 24px rgba(231,76,60,0.65))' : 'drop-shadow(0 0 24px rgba(255,200,80,0.55))')
                : 'none',
          transition: 'filter 0.4s ease',
        }}
      >
        <Clock angle={angle} totalRevolutions={totalRevolutions} size={clockSize} showMirror={prestigeMirrorLevel >= 1} />
        {extraAngles.map((a, i) => (
          <Clock key={i} angle={a} totalRevolutions={extraRevolutions[i]} size={clockSize} showMirror={prestigeMirrorLevel >= i + 2} />
        ))}
      </div>

      <EnergyDisplay energy={energy} energyPerSecond={energyPerSecond} timeDust={timeDust} />

      <div
        className="w-48 h-px"
        style={{ background: 'var(--color-border)' }}
      />

      <UpgradePanel
        energy={energy}
        upgradeCost={upgradeCost}
        speedLevel={speedLevel}
        speedMultiplier={speedMultiplier}
        nextSpeedMultiplier={nextSpeedMultiplier}
        onBuyUpgrade={buyUpgrade}
        energyUpgradeCost={energyUpgradeCost}
        energyLevel={energyLevel}
        energyPerRevolution={energyPerRevolution}
        nextEnergyPerRevolution={nextEnergyPerRevolution}
        onBuyEnergyUpgrade={buyEnergyUpgrade}
        clockCount={clockCount}
        clockAtMax={clockAtMax}
        clock2SpeedBonus={clock2SpeedBonus}
        clock3EntropyReduction={clock3EntropyReduction}
        clockUpgradeCost={clockUpgradeCost}
        onBuyClockUpgrade={buyClockUpgrade}
        boostLevel={boostLevel}
        extraClockSpeedFactor={extraClockSpeedFactor}
        nextExtraClockSpeedFactor={nextExtraClockSpeedFactor}
        boostUpgradeCost={boostUpgradeCost}
        boostAtMax={boostAtMax}
        onBuyBoostUpgrade={buyBoostUpgrade}
        entropy={entropy}
        nextEntropy={nextEntropy}
        stabilityLevel={stabilityLevel}
        stabilityUpgradeCost={stabilityUpgradeCost}
        onBuyStabilityUpgrade={buyStabilityUpgrade}
      />

      <button
        onClick={() => setShowPrestige(true)}
        className="px-6 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
        style={{
          background: canPrestige
            ? 'linear-gradient(135deg, #9d8fffcc, #7c6ff7)'
            : 'transparent',
          border: `1px solid ${canPrestige ? 'rgba(124,111,247,0.6)' : 'var(--color-border)'}`,
          color: canPrestige ? '#fff' : 'var(--color-muted)',
          cursor: 'pointer',
          boxShadow: canPrestige ? '0 0 20px rgba(124,111,247,0.25)' : 'none',
        }}
      >
        ✦ Prestige{prestigePoints > 0 ? ` · ${prestigePoints} PP` : ''}
      </button>

      <div className="flex gap-2">
        <button
          onClick={debugAddEnergy}
          className="text-xs px-3 py-1.5 rounded-md transition-colors duration-150"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-muted)';
          }}
        >
          +1k TE
        </button>

        <button
          onClick={debugAddTimeDust}
          className="text-xs px-3 py-1.5 rounded-md transition-colors duration-150"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#5ecfb0';
            e.currentTarget.style.color = '#5ecfb0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-muted)';
          }}
        >
          +100 TD
        </button>

        <button
          onClick={() => {
            if (window.confirm('Reset all progress and start fresh?')) resetGame();
          }}
          className="text-xs px-3 py-1.5 rounded-md transition-colors duration-150"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-muted)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#c0392b';
            e.currentTarget.style.color = '#e74c3c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-muted)';
          }}
        >
          Reset Game
        </button>
      </div>

      {showPrestige && (
        <PrestigeModal
          timeDust={timeDust}
          prestigePoints={prestigePoints}
          canPrestige={canPrestige}
          onPrestige={() => { prestige(); setShowPrestige(false); }}
          onClose={() => setShowPrestige(false)}
          prestigeSpeedLevel={prestigeSpeedLevel} prestigeSpeedCost={prestigeSpeedCost} buyPrestigeSpeed={buyPrestigeSpeed}
          prestigeEnergyLevel={prestigeEnergyLevel} prestigeEnergyCost={prestigeEnergyCost} buyPrestigeEnergy={buyPrestigeEnergy}
          prestigeClockLevel={prestigeClockLevel} prestigeClockCost={prestigeClockCost} buyPrestigeClock={buyPrestigeClock}
          prestigeBoostLevel={prestigeBoostLevel} prestigeBoostCost={prestigeBoostCost} buyPrestigeBoost={buyPrestigeBoost}
          prestigeAnchorLevel={prestigeAnchorLevel} prestigeAnchorCost={prestigeAnchorCost} buyPrestigeAnchor={buyPrestigeAnchor}
          prestigeMirrorLevel={prestigeMirrorLevel} prestigeMirrorCost={prestigeMirrorCost} buyPrestigeMirror={buyPrestigeMirror}
        />
      )}
    </div>
  );
}
