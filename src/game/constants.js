// ---------------------------------------------------------------------------
// Game constants — all tunable values in one place for easy balancing
// ---------------------------------------------------------------------------

// Base duration of one clock revolution in milliseconds (real time)
// At 1x speed this equals 60 000 ms (one minute per revolution)
export const BASE_REVOLUTION_MS = 60_000;

// Time Energy generated per full second-hand revolution
export const ENERGY_PER_REVOLUTION = 1;

// Accelerate Time upgrade
export const UPGRADE_BASE_COST = 2;              // cost of the first purchase
export const UPGRADE_COST_EXPONENT = 1.35;        // exponential growth factor
export const UPGRADE_SPEED_BONUS = 0.20;          // base speed bonus for level 1
export const UPGRADE_SPEED_BONUS_SCALING = 1.05;  // each level's bonus is 5% larger than the last

// Improve Time upgrade
export const ENERGY_UPGRADE_BASE_COST = 2;              // cost of the first purchase
export const ENERGY_UPGRADE_COST_EXPONENT = 1.50;       // steeper curve — TE income is powerful
export const ENERGY_UPGRADE_VALUE_BONUS = 0.60;         // base TE/rev bonus for level 1
export const ENERGY_UPGRADE_VALUE_SCALING = 1.05;       // each level's bonus is 5% larger than the last

// Add Clock upgrade
export const CLOCK_UPGRADE_BASE_COST = 200;      // cost of the first extra clock
export const CLOCK_UPGRADE_COST_EXPONENT = 13.0;
export const CLOCK_SPEED_FACTOR = 0.1;           // base speed ratio between adjacent extra clocks
export const CLOCK_YIELD_MULTIPLIER = 10;        // Each successive clock earns this many times more TE and TimeDust than the previous one.

// Boost Clocks upgrade — increases the base speed factor for all extra clocks
export const BOOST_UPGRADE_BASE_COST = 75;             // cost of the first boost
export const BOOST_UPGRADE_COST_EXPONENT = 1.80;        // steep — this is very powerful
export const BOOST_SPEED_BONUS = 0.10;                  // base factor bonus for level 1
export const BOOST_SPEED_BONUS_SCALING = 1.05;          // each level's bonus is 5% larger than the last

// Time Entropy — chaos that grows with speed; resisted by the Anchor Time upgrade
export const ENTROPY_BASE_STABILITY = 4;             // stability denominator at level 0
export const ENTROPY_STABILITY_SCALING = 1.5;        // each stability level multiplies stability by this
export const STABILITY_UPGRADE_BASE_COST = 100;       // cost of first Anchor Time purchase
export const STABILITY_UPGRADE_COST_EXPONENT = 2.5;  // steep — stability fights a powerful force

// Time Fracture — TE loss triggered when minute and hour hands overlap at high entropy
export const FRACTURE_ENTROPY_THRESHOLD = 0.4;    // entropy below this causes no fracture
export const FRACTURE_LOSS_AT_THRESHOLD = 0.10;   // 10% TE lost at threshold entropy
export const FRACTURE_LOSS_AT_MAX = 0.40;         // 40% TE lost at entropy 1.0
export const FRACTURE_FLASH_MS = 2_000;           // duration of the fracture visual flash

// TimeDust — earned when the minute and hour hands overlap on any clock
export const TIMEDUST_THRESHOLD_DEG = 5;       // angular proximity to count as overlap (degrees)

// Fast Time — triggered when second and minute hands overlap on any clock
export const FAST_TIME_DURATION_MS = 3_000;       // how long the boost lasts (ms)
export const FAST_TIME_MULTIPLIER = 1.5;           // speed multiplier while active (buff)
export const FAST_TIME_DEBUFF_MULTIPLIER = 0.5;    // speed multiplier when entropy corrupts it (debuff)
export const FAST_TIME_THRESHOLD_DEG = 5;          // angular proximity to count as overlap (degrees)
// Debuff chance scales linearly from ENTROPY_DEBUFF_CHANCE_MIN at ENTROPY_DEBUFF_THRESHOLD
// up to ENTROPY_DEBUFF_CHANCE_MAX at entropy 1.0
export const ENTROPY_DEBUFF_THRESHOLD = 0.4;
export const ENTROPY_DEBUFF_CHANCE_MIN = 0.10;
export const ENTROPY_DEBUFF_CHANCE_MAX = 0.70;

// Autosave interval in milliseconds
export const AUTOSAVE_INTERVAL_MS = 5_000;

// Key used for localStorage persistence
export const SAVE_KEY = 'chronoforge_save_v1';

// Maximum offline time credited (in ms) — prevents abuse / overflow
export const MAX_OFFLINE_MS = 4 * 60 * 60 * 1_000; // 4 hours
