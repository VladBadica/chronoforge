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
    totalRevolutions,
    buyUpgrade,
    addSecond,
  } = useGameStore();

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

      <StatsBar totalRevolutions={totalRevolutions} speedMultiplier={speedMultiplier} />

      <Clock angle={angle} totalRevolutions={totalRevolutions} onClick={addSecond} />

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
      />
    </div>
  );
}
