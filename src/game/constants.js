// ---------------------------------------------------------------------------
// Game constants — all tunable values in one place for easy balancing
// ---------------------------------------------------------------------------

// ── Core ─────────────────────────────────────────────────────────────────────

// Base duration of one clock revolution in milliseconds (real time)
// At 1x speed this equals 60 000 ms (one minute per revolution)
export const BASE_REVOLUTION_MS = 60_000;

// Time Energy generated per full second-hand revolution
export const ENERGY_PER_REVOLUTION = 1;

// ── Upgrades ─────────────────────────────────────────────────────────────────

// Accelerate Time — increases main clock speed multiplier
export const UPGRADE_BASE_COST = 2;
export const UPGRADE_COST_EXPONENT = 1.35;
export const UPGRADE_SPEED_BONUS = 0.20;          // base speed bonus for level 1
export const UPGRADE_SPEED_BONUS_SCALING = 1.05;  // each level's bonus is 5% larger than the last

// Improve Time — increases TE per revolution
export const ENERGY_UPGRADE_BASE_COST = 2;
export const ENERGY_UPGRADE_COST_EXPONENT = 1.50;
export const ENERGY_UPGRADE_VALUE_BONUS = 0.60;
export const ENERGY_UPGRADE_VALUE_SCALING = 1.05;

// Add Clock — extra clocks earn TE & TD with unique per-clock effects
export const CLOCK_UPGRADE_BASE_COST = 200;
export const CLOCK_UPGRADE_COST_EXPONENT = 13.0;
export const CLOCK_SPEED_FACTOR = 0.1;            // base speed ratio between adjacent extra clocks
export const CLOCK_YIELD_MULTIPLIER = 10;         // each successive clock earns this many times more TE and TD
export const CLOCK_MAX_EXTRA = 2;                 // hard cap on purchasable extra clocks
export const CLOCK2_SPEED_BONUS = 0.10;           // clock 2: additive speed bonus per revolution (uncapped)
export const CLOCK3_ENTROPY_REDUCTION = 0.01;     // clock 3: entropy reduction per revolution

// Boost Clocks — increases base speed factor for all extra clocks
export const BOOST_UPGRADE_BASE_COST = 75;
export const BOOST_UPGRADE_COST_EXPONENT = 1.80;
export const BOOST_MAX_LEVEL = 20;
export const BOOST_SPEED_FACTOR_MAX = 1.0;        // extra clock speed factor at max boost level (100%)

// Anchor Time — reduces Time Entropy by increasing stability
export const ENTROPY_BASE_STABILITY = 4;
export const ENTROPY_STABILITY_SCALING = 1.5;
export const STABILITY_UPGRADE_BASE_COST = 100;
export const STABILITY_UPGRADE_COST_EXPONENT = 2.5;

// ── Entropy ───────────────────────────────────────────────────────────────────

// Debuff chance scales linearly from MIN at THRESHOLD up to MAX at entropy 1.0
export const ENTROPY_DEBUFF_THRESHOLD = 0.4;
export const ENTROPY_DEBUFF_CHANCE_MIN = 0.10;
export const ENTROPY_DEBUFF_CHANCE_MAX = 0.70;

// ── Events ────────────────────────────────────────────────────────────────────

// Fast Time — triggered when second and minute hands overlap on any clock
export const FAST_TIME_THRESHOLD_DEG = 5;
export const FAST_TIME_DURATION_MS = 3_000;
export const FAST_TIME_MULTIPLIER = 2;            // speed multiplier while active (buff)
export const FAST_TIME_DEBUFF_MULTIPLIER = 0.5;   // speed multiplier when entropy corrupts it (debuff)

// Time Fracture — TE loss when minute and hour hands overlap at high entropy
export const FRACTURE_ENTROPY_THRESHOLD = 0.4;
export const FRACTURE_LOSS_AT_THRESHOLD = 0.10;   // 10% TE lost at threshold entropy
export const FRACTURE_LOSS_AT_MAX = 0.40;         // 40% TE lost at entropy 1.0
export const FRACTURE_FLASH_MS = 2_000;

// TimeDust — earned when minute and hour hands overlap on any clock
export const TIMEDUST_THRESHOLD_DEG = 5;
export const TIMEDUST_BASE_YIELD = 0.1;           // TD awarded to main clock per overlap; extra clocks scale by CLOCK_YIELD_MULTIPLIER

// Temporal Surge — triggered when all three hands align at 12 o'clock
export const SURGE_THRESHOLD_DEG = 3;
export const SURGE_DURATION_MS = 30_000;
export const SURGE_SPEED_MULTIPLIER = 5;
export const SURGE_ENERGY_MULTIPLIER = 3;

// ── Prestige ──────────────────────────────────────────────────────────────────

export const PRESTIGE_COST_TD = 10;               // minimum TD required to prestige

// Costs paid in Prestige Points; scale exponentially per level
export const PRESTIGE_SPEED_BASE_COST = 2;        // P1: Start with Accelerate Time +1 lv
export const PRESTIGE_SPEED_SCALING = 1.3;
export const PRESTIGE_ENERGY_BASE_COST = 2;       // P2: Start with Improve Time +1 lv
export const PRESTIGE_ENERGY_SCALING = 1.3;
export const PRESTIGE_CLOCK_BASE_COST = 10;       // P3: Start with Add Clock +1 lv
export const PRESTIGE_CLOCK_SCALING = 5.0;
export const PRESTIGE_BOOST_BASE_COST = 3;        // P4: Start with Boost Clocks +1 lv
export const PRESTIGE_BOOST_SCALING = 1.7;
export const PRESTIGE_ANCHOR_BASE_COST = 2;       // P5: Start with Anchor Time +1 lv
export const PRESTIGE_ANCHOR_SCALING = 2.0;
export const PRESTIGE_MIRROR_BASE_COST = 15;      // Mirror Clocks: backward hand per clock
export const PRESTIGE_MIRROR_SCALING = 5.0;

// ── System ────────────────────────────────────────────────────────────────────

export const AUTOSAVE_INTERVAL_MS = 5_000;
export const SAVE_KEY = 'chronoforge_save_v1';
export const MAX_OFFLINE_MS = 4 * 60 * 60 * 1_000; // 4 hours
