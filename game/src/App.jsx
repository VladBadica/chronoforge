import { useState } from 'react';
import { useGameEngine } from './hooks/useGameEngine.js';
import { useGameStore } from './store/useGameStore.js';
import { Clock } from './components/Clock.jsx';
import { ExtraClock } from './components/ExtraClock.jsx';
import { EnergyDisplay } from './components/EnergyDisplay.jsx';
import { UpgradePanel } from './components/UpgradePanel.jsx';
import { StatsBar } from './components/StatsBar.jsx';
import { PrestigeModal } from './components/PrestigeModal.jsx';
import { AscendModal } from './components/AscendModal.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { FAST_TIME_MULTIPLIER, FAST_TIME_DEBUFF_MULTIPLIER } from './game/constants.js';
import { fmt } from './utils/format.js';

// Extra clocks (by index) each accumulate one permanent bonus per revolution.
// `kind` selects the ExtraClock pivot glyph; `value` is the current
// accumulated total shown in its tooltip.
const EXTRA_CLOCK_EFFECTS = [
  { kind: 'speed',   value: (b) => `currently +${fmt(b.clock2SpeedBonus, 2)} speed` },
  { kind: 'energy',  value: (b) => `currently +${fmt(b.clock3TeBonus, 2)} TE/rev` },
  { kind: 'entropy', value: (b) => `currently -${fmt(b.clock4EntropyReduction * 100, 1)}% entropy` },
];

export default function App() {
  useGameEngine();
  const [showPrestige, setShowPrestige] = useState(false);
  const [showAscend, setShowAscend] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(false);

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
    clock3TeBonus,
    clock4EntropyReduction,
    boostLevel,
    boostAtMax,
    timeDust,
    extraClockSpeedFactor,
    nextExtraClockSpeedFactor,
    extraAngles,

    extraClockRunning,
    extraClockMaintenanceCosts,
    toggleExtraClock,
    clockUpgradeCost,
    boostUpgradeCost,
    isFastTime,
    fastTimeIsDebuff,
    isFracture,
    isSurge,
    surgeRemaining,
    isReverse,
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
    singularities,
    singularityGain,
    canAscend,
    ascend,
    totalClicks,
    timesPrestiged,
    totalPPEarned,
    maxSpeedReached,
    timesAscended,
    prestigeSpeedLevel, prestigeSpeedCost, buyPrestigeSpeed,
    prestigeEnergyLevel, prestigeEnergyCost, buyPrestigeEnergy,
    prestigeClockLevel, prestigeClockCost, buyPrestigeClock, prestigeClockAtMax, prestigeClockRefund, refundPrestigeClock,
    prestigeBoostLevel, prestigeBoostCost, buyPrestigeBoost, prestigeBoostAtMax,
    prestigeAnchorLevel, prestigeAnchorCost, buyPrestigeAnchor, prestigeAnchorRefund, refundPrestigeAnchor,
    prestigeMirrorLevel, prestigeMirrorCost, buyPrestigeMirror, prestigeMirrorAtMax,
    prestigeTdLevel, prestigeTdCost, buyPrestigeTd,
    prestigeEntropyReduceLevel, prestigeEntropyReduceCost, buyPrestigeEntropyReduce, prestigeEntropyReduceAtMax,
    prestigeEntropyTeLevel, prestigeEntropyTeCost, buyPrestigeEntropyTe, prestigeEntropyTeAtMax,
    prestigeEntropyTdLevel, prestigeEntropyTdCost, buyPrestigeEntropyTd, prestigeEntropyTdAtMax,
    prestigeAscendLevel, prestigeAscendCost, buyPrestigeAscend, prestigeAscendAtMax,
    prestigeSingularityLevel, prestigeSingularityCost, buyPrestigeSingularity, prestigeSingularityAtMax,
    addSecond,
    resetGame,
    saveGame,
    debugAddEnergy,
    debugAddTimeDust,
  } = useGameStore();

  return (
    <div
      className="min-h-screen grid app-grid"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* ── LHS — upgrades + actions ───────────────────────────────────── */}
      <div className="flex flex-col gap-5 p-5 overflow-y-auto items-center justify-center">

        <div className="flex items-center justify-between w-full shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-muted)' }}>
            Upgrades
          </h2>
          <button
            onClick={() => setShowSettings(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)', lineHeight: 1, padding: 2 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-muted)'; }}
            title="Settings"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

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
          clock3TeBonus={clock3TeBonus}
          clock4EntropyReduction={clock4EntropyReduction}
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

        <div className="h-px w-full" style={{ background: 'var(--color-border)' }} />

        <button
          onClick={() => setShowPrestige(true)}
          className="w-full rounded-lg text-sm font-semibold transition-all duration-200"
          style={{
            background: canPrestige ? 'linear-gradient(135deg, #9d8fffcc, #7c6ff7)' : 'transparent',
            border: `1px solid ${canPrestige ? 'rgba(124,111,247,0.6)' : 'var(--color-border)'}`,
            color: canPrestige ? '#fff' : 'var(--color-muted)',
            cursor: 'pointer',
            boxShadow: canPrestige ? '0 0 20px rgba(124,111,247,0.25)' : 'none',
          }}
        >
          ✦ Prestige{prestigePoints > 0 ? ` · ${prestigePoints} PP` : ''}
        </button>

        {canAscend && (
          <button
            onClick={() => setShowAscend(true)}
            className="w-full rounded-lg text-sm font-semibold transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #f0c060cc, #e6a830)',
              border: '1px solid rgba(240,192,96,0.5)',
              color: '#0a0a0f',
              cursor: 'pointer',
              fontWeight: 700,
              boxShadow: '0 0 24px rgba(240,192,96,0.2)',
            }}
          >
            ✦ Ascend{singularities > 0 ? ` · ${singularities} ✦` : ''}
          </button>
        )}

        {debugEnabled && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={debugAddEnergy}
              className="text-xs rounded-md transition-colors duration-150"
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >+100k TE</button>
            <button
              onClick={debugAddTimeDust}
              className="text-xs rounded-md transition-colors duration-150"
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5ecfb0'; e.currentTarget.style.color = '#5ecfb0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >+100 TD</button>
            <button
              onClick={() => { if (window.confirm('Reset all progress and start fresh?')) resetGame(); }}
              className="text-xs rounded-md transition-colors duration-150"
              style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-muted)', cursor: 'pointer' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#c0392b'; e.currentTarget.style.color = '#e74c3c'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-muted)'; }}
            >Reset Game</button>
          </div>
        )}
      </div>

      {/* ── RHS — game view ────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-8" style={{ justifyContent: 'flex-start', paddingTop: '6rem', paddingBottom: '2.5rem', paddingLeft: '2rem', paddingRight: '2rem' }}>

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
          <p className="text-xs tracking-widest uppercase" style={{ color: 'var(--color-muted)' }}>
            Forge time itself
          </p>
        </header>

        <StatsBar totalRevolutions={totalRevolutions} speedMultiplier={speedMultiplier} isFastTime={isFastTime} fastTimeIsDebuff={fastTimeIsDebuff} fastTimeMultiplier={FAST_TIME_MULTIPLIER} fastTimeDebuffMultiplier={FAST_TIME_DEBUFF_MULTIPLIER} isSurge={isSurge} surgeRemaining={surgeRemaining} />

        <div className="w-full max-w-md flex flex-col gap-1">
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

        <div className="flex items-center justify-center gap-6">
          <div
            onClick={addSecond}
            style={{
              cursor: 'pointer',
              filter: isFracture
                ? 'drop-shadow(0 0 32px rgba(231,76,60,0.9))'
                : isReverse
                  ? 'drop-shadow(0 0 28px rgba(231,76,60,0.85))'
                  : isSurge
                    ? 'drop-shadow(0 0 40px rgba(168,143,255,0.85))'
                    : isFastTime
                      ? (fastTimeIsDebuff ? 'drop-shadow(0 0 24px rgba(231,76,60,0.65))' : 'drop-shadow(0 0 24px rgba(255,200,80,0.55))')
                      : 'none',
              transition: 'filter 0.4s ease',
            }}
          >
            <Clock angle={angle} totalRevolutions={totalRevolutions} size={220} showMirror={prestigeMirrorLevel >= 1} entropy={entropy} suppressWarp={prestigeSingularityLevel >= 1} />
          </div>

          {extraAngles.length > 0 && (
            <div className="flex flex-col items-center gap-2">
              {extraAngles.map((a, i) => {
                const effect = EXTRA_CLOCK_EFFECTS[i];
                return (
                  <ExtraClock
                    key={i}
                    angle={a}
                    size={90}
                    running={extraClockRunning[i] ?? true}
                    maintenanceCost={extraClockMaintenanceCosts[i] ?? 0}
                    onClick={() => toggleExtraClock(i)}
                    kind={effect?.kind}
                    effectValue={effect?.value({ clock2SpeedBonus, clock3TeBonus, clock4EntropyReduction })}
                  />
                );
              })}
            </div>
          )}
        </div>

        <EnergyDisplay energy={energy} energyPerSecond={energyPerSecond} timeDust={timeDust} />
      </div>

      {showPrestige && (
        <PrestigeModal
          timeDust={timeDust}
          entropy={entropy}
          prestigePoints={prestigePoints}
          canPrestige={canPrestige}
          onPrestige={() => { prestige(); }}
          onClose={() => setShowPrestige(false)}
          prestigeSpeedLevel={prestigeSpeedLevel} prestigeSpeedCost={prestigeSpeedCost} buyPrestigeSpeed={buyPrestigeSpeed}
          prestigeEnergyLevel={prestigeEnergyLevel} prestigeEnergyCost={prestigeEnergyCost} buyPrestigeEnergy={buyPrestigeEnergy}
          prestigeClockLevel={prestigeClockLevel} prestigeClockCost={prestigeClockCost} buyPrestigeClock={buyPrestigeClock} prestigeClockAtMax={prestigeClockAtMax} prestigeClockRefund={prestigeClockRefund} refundPrestigeClock={refundPrestigeClock}
          prestigeBoostLevel={prestigeBoostLevel} prestigeBoostCost={prestigeBoostCost} buyPrestigeBoost={buyPrestigeBoost} prestigeBoostAtMax={prestigeBoostAtMax}
          prestigeAnchorLevel={prestigeAnchorLevel} prestigeAnchorCost={prestigeAnchorCost} buyPrestigeAnchor={buyPrestigeAnchor} prestigeAnchorRefund={prestigeAnchorRefund} refundPrestigeAnchor={refundPrestigeAnchor}
          prestigeMirrorLevel={prestigeMirrorLevel} prestigeMirrorCost={prestigeMirrorCost} buyPrestigeMirror={buyPrestigeMirror} prestigeMirrorAtMax={prestigeMirrorAtMax}
          prestigeTdLevel={prestigeTdLevel} prestigeTdCost={prestigeTdCost} buyPrestigeTd={buyPrestigeTd}
          prestigeEntropyReduceLevel={prestigeEntropyReduceLevel} prestigeEntropyReduceCost={prestigeEntropyReduceCost} buyPrestigeEntropyReduce={buyPrestigeEntropyReduce} prestigeEntropyReduceAtMax={prestigeEntropyReduceAtMax}
          prestigeEntropyTeLevel={prestigeEntropyTeLevel} prestigeEntropyTeCost={prestigeEntropyTeCost} buyPrestigeEntropyTe={buyPrestigeEntropyTe} prestigeEntropyTeAtMax={prestigeEntropyTeAtMax}
          prestigeEntropyTdLevel={prestigeEntropyTdLevel} prestigeEntropyTdCost={prestigeEntropyTdCost} buyPrestigeEntropyTd={buyPrestigeEntropyTd} prestigeEntropyTdAtMax={prestigeEntropyTdAtMax}
          prestigeAscendLevel={prestigeAscendLevel} prestigeAscendCost={prestigeAscendCost} buyPrestigeAscend={buyPrestigeAscend} prestigeAscendAtMax={prestigeAscendAtMax}
          prestigeSingularityLevel={prestigeSingularityLevel} prestigeSingularityCost={prestigeSingularityCost} buyPrestigeSingularity={buyPrestigeSingularity} prestigeSingularityAtMax={prestigeSingularityAtMax}
        />
      )}

      {showAscend && (
        <AscendModal
          singularities={singularities}
          singularityGain={singularityGain}
          canAscend={canAscend}
          onAscend={() => { ascend(); setShowAscend(false); }}
          onClose={() => setShowAscend(false)}
        />
      )}

      {showSettings && (
        <SettingsModal
          totalRevolutions={totalRevolutions}
          speedMultiplier={speedMultiplier}
          totalClicks={totalClicks}
          timesPrestiged={timesPrestiged}
          totalPPEarned={totalPPEarned}
          maxSpeedReached={maxSpeedReached}
          timesAscended={timesAscended}
          singularities={singularities}
          onSave={saveGame}
          onClose={() => setShowSettings(false)}
          onDebugUnlock={() => setDebugEnabled(true)}
        />
      )}
    </div>
  );
}
