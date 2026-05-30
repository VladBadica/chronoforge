// ---------------------------------------------------------------------------
// useGameEngine — mounts/unmounts the GameEngine alongside the component tree
//
// This hook:
//   1. Loads a saved game on first mount
//   2. Starts the requestAnimationFrame loop
//   3. Handles tab visibility changes (pause when hidden to save CPU; the
//      offline-progress system credits energy on resume)
//   4. Saves and stops the loop on unmount
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { gameEngine } from '../game/GameEngine.js';

export function useGameEngine() {
  useEffect(() => {
    // Load any persisted save before starting the loop
    gameEngine.load();
    gameEngine.start();

    // Pause loop when tab is hidden — the offline progress system will
    // credit the gap when the player returns (handled in GameEngine.load).
    const handleVisibilityChange = () => {
      if (document.hidden) {
        gameEngine.save();   // snapshot energy before pausing
        gameEngine.stop();
      } else {
        gameEngine.load();   // apply offline progress
        gameEngine.start();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      // Clean up on component unmount (React StrictMode double-invoke safe)
      gameEngine.save();
      gameEngine.stop();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty deps — run once for the app lifetime
}
