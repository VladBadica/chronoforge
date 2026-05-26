// ---------------------------------------------------------------------------
// App — root component, wires the game engine into the component tree
//
// Layout (dark minimalist, single-column):
//   [Header]
//   [StatsBar]
//   [Clock]
//   [EnergyDisplay]
//   [UpgradePanel]
// ---------------------------------------------------------------------------

import React from 'react';
import { useGameEngine } from './hooks/useGameEngine.js';
import { useGameStore } from './store/useGameStore.js';
import { Clock } from './components/Clock.jsx';
import { EnergyDisplay } from './components/EnergyDisplay.jsx';
import { UpgradePanel } from './components/UpgradePanel.jsx';
import { StatsBar } from './components/StatsBar.jsx';

export default function App() {
  useGameEngine();

  const {
    angle,
    energy,
    energyPerSecond,
    speedLevel,
    speedMultiplier,
    upgradeCost,
    energyLevel,
    energyPerRevolution,
    energyUpgradeCost,
    clockCount,
    boostLevel,
    extraClockSpeedFactor,
    extraAngles,
    extraRevolutions,
    clockUpgradeCost,
    boostUpgradeCost,
    isFastTime,
    totalRevolutions,
    buyUpgrade,
    buyEnergyUpgrade,
    buyClockUpgrade,
    buyBoostUpgrade,
    addSecond,
    resetGame,
  } = useGameStore();

  // Scale clocks down as more are added so they all fit comfortably
  const clockSize = clockCount === 1 ? 220 : clockCount === 2 ? 180 : 140;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-8 px-4 py-12"
      style={{ background: 'var(--color-bg)' }}
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

      <StatsBar totalRevolutions={totalRevolutions} speedMultiplier={speedMultiplier} isFastTime={isFastTime} />

      <div
        className="flex items-center justify-center gap-4 flex-wrap"
        onClick={addSecond}
        style={{
          cursor: 'pointer',
          filter: isFastTime ? 'drop-shadow(0 0 24px rgba(255,200,80,0.55))' : 'none',
          transition: 'filter 0.4s ease',
        }}
      >
        <Clock angle={angle} totalRevolutions={totalRevolutions} size={clockSize} />
        {extraAngles.map((a, i) => (
          <Clock key={i} angle={a} totalRevolutions={extraRevolutions[i]} size={clockSize} />
        ))}
      </div>

      <EnergyDisplay energy={energy} energyPerSecond={energyPerSecond} />

      <div
        className="w-48 h-px"
        style={{ background: 'var(--color-border)' }}
      />

      <UpgradePanel
        energy={energy}
        upgradeCost={upgradeCost}
        speedLevel={speedLevel}
        speedMultiplier={speedMultiplier}
        onBuyUpgrade={buyUpgrade}
        energyUpgradeCost={energyUpgradeCost}
        energyLevel={energyLevel}
        energyPerRevolution={energyPerRevolution}
        onBuyEnergyUpgrade={buyEnergyUpgrade}
        clockCount={clockCount}
        clockUpgradeCost={clockUpgradeCost}
        onBuyClockUpgrade={buyClockUpgrade}
        boostLevel={boostLevel}
        extraClockSpeedFactor={extraClockSpeedFactor}
        boostUpgradeCost={boostUpgradeCost}
        onBuyBoostUpgrade={buyBoostUpgrade}
      />

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
  );
}
