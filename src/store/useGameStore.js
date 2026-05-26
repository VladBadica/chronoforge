// ---------------------------------------------------------------------------
// Zustand game store
//
// Architecture:
//   The store is the bridge between the GameEngine (pure simulation) and
//   React components (pure rendering).  It holds a snapshot of the engine
//   state and exposes actions that forward to the engine.
//
//   Data flow:
//     GameEngine._update()
//       → engine._emitSnapshot(snapshot)
//         → store.syncFromEngine(snapshot)          ← engine pushes each frame
//           → React components re-render
//
//   Actions (buyUpgrade, etc.) call engine methods directly, then the next
//   _emitSnapshot will propagate the updated numbers back to the store.
// ---------------------------------------------------------------------------

import { create } from 'zustand';
import { gameEngine } from '../game/GameEngine.js';

export const useGameStore = create((set) => {
  // Wire the engine's tick callback to push snapshots into this store.
  // This is set up once at module load time — before any component mounts.
  gameEngine.setTickCallback((snapshot) => {
    set({
      angle: snapshot.angle,
      energy: snapshot.energy,
      speedLevel: snapshot.speedLevel,
      speedMultiplier: snapshot.speedMultiplier,
      energyPerSecond: snapshot.energyPerSecond,
      upgradeCost: snapshot.upgradeCost,
      energyLevel: snapshot.energyLevel,
      energyPerRevolution: snapshot.energyPerRevolution,
      energyUpgradeCost: snapshot.energyUpgradeCost,
      clockCount: snapshot.clockCount,
      boostLevel: snapshot.boostLevel,
      extraClockSpeedFactor: snapshot.extraClockSpeedFactor,
      extraAngles: snapshot.extraAngles,
      extraRevolutions: snapshot.extraRevolutions,
      clockUpgradeCost: snapshot.clockUpgradeCost,
      boostUpgradeCost: snapshot.boostUpgradeCost,
      totalRevolutions: snapshot.totalRevolutions,
    });
  });

  return {
    // --- state (mirrors engine snapshot) ---
    angle: 0,
    energy: 0,
    speedLevel: 0,
    speedMultiplier: 1,
    energyPerSecond: 0,
    upgradeCost: 10,
    energyLevel: 0,
    energyPerRevolution: 1,
    energyUpgradeCost: 15,
    clockCount: 1,
    boostLevel: 0,
    extraClockSpeedFactor: 0.1,
    extraAngles: [],
    extraRevolutions: [],
    clockUpgradeCost: 50,
    boostUpgradeCost: 25,
    totalRevolutions: 0,

    // --- actions ---

    /**
     * Attempt to purchase one level of "Accelerate Time".
     * The engine handles the cost check and state mutation;
     * the next tick will sync the new values back here.
     */
    addSecond: () => {
      gameEngine.addSecond();
    },

    buyUpgrade: () => {
      gameEngine.buyUpgrade();
    },

    buyEnergyUpgrade: () => {
      gameEngine.buyEnergyUpgrade();
    },

    buyClockUpgrade: () => {
      gameEngine.buyClockUpgrade();
    },

    buyBoostUpgrade: () => {
      gameEngine.buyBoostUpgrade();
    },

    /**
     * Trigger a manual save (the engine autosaves on its own interval,
     * but this can be called from a UI button).
     */
    saveGame: () => {
      gameEngine.save();
    },

    resetGame: () => {
      gameEngine.reset();
    },
  };
});
