// ---------------------------------------------------------------------------
// Game constants — all tunable values in one place for easy balancing
// ---------------------------------------------------------------------------

// Base duration of one clock revolution in milliseconds (real time)
// At 1x speed this equals 60 000 ms (one minute per revolution)
export const BASE_REVOLUTION_MS = 60_000;

// Time Energy generated per full second-hand revolution
export const ENERGY_PER_REVOLUTION = 1;

// Accelerate Time upgrade
export const UPGRADE_BASE_COST = 2;        // cost of the first purchase
export const UPGRADE_COST_EXPONENT = 1.35;  // exponential growth factor
export const UPGRADE_SPEED_BONUS = 0.20;    // +20% clock speed per level

// Improve Time upgrade
export const ENERGY_UPGRADE_BASE_COST = 2;       // cost of the first purchase
export const ENERGY_UPGRADE_COST_EXPONENT = 1.50; // steeper curve — TE income is powerful
export const ENERGY_UPGRADE_VALUE_BONUS = 0.50;   // +0.5 TE per revolution per level

// Autosave interval in milliseconds
export const AUTOSAVE_INTERVAL_MS = 5_000;

// Key used for localStorage persistence
export const SAVE_KEY = 'chronoforge_save_v1';

// Maximum offline time credited (in ms) — prevents abuse / overflow
export const MAX_OFFLINE_MS = 4 * 60 * 60 * 1_000; // 4 hours
