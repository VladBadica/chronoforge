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

// Add Clock — extra clocks with unique per-clock effects
export const CLOCK_UPGRADE_BASE_COST = 100;
export const CLOCK_UPGRADE_COST_EXPONENT = 3.0;
export const CLOCK_SPEED_FACTOR = 0.1;            // clock 2 base speed (reference for boost normalisation)
export const CLOCK_MAX_EXTRA = 3;                 // hard cap on purchasable extra clocks
// Per-clock base speeds (fraction of main clock speed at boost 0)
export const CLOCK2_BASE_SPEED = 0.10;
export const CLOCK3_BASE_SPEED = 0.05;
export const CLOCK4_BASE_SPEED = 0.001;
// Per-clock special effects — accumulated permanently each revolution
export const CLOCK2_SPEED_BONUS = 0.02;           // clock 2: +1% additive speed per revolution (uncapped)
export const CLOCK3_TE_BONUS = 2;              // clock 3: +1 TE/rev per revolution (uncapped)
export const CLOCK4_ENTROPY_REDUCTION = 0.01;     // clock 4: 1% entropy reduction per revolution

// Boost Clocks — increases base speed factor for all extra clocks
export const BOOST_UPGRADE_BASE_COST = 75;
export const BOOST_UPGRADE_COST_EXPONENT = 1.80;
export const BOOST_MAX_LEVEL = 20;
export const BOOST_SPEED_FACTOR_MAX = 1.0;        // extra clock speed factor at max boost level (100%)

// Anchor Time — reduces Time Entropy by increasing stability
export const ENTROPY_BASE_STABILITY = 4;
export const ENTROPY_STABILITY_SCALING = 1.5;
export const STABILITY_UPGRADE_BASE_COST = 400;
export const STABILITY_UPGRADE_COST_EXPONENT = 2;

// ── Entropy ───────────────────────────────────────────────────────────────────

// Debuff chance scales linearly from MIN at THRESHOLD up to MAX at entropy 1.0
export const ENTROPY_DEBUFF_THRESHOLD = 0.4;
export const ENTROPY_DEBUFF_CHANCE_MIN = 0.10;
export const ENTROPY_DEBUFF_CHANCE_MAX = 0.70;

// TE penalty — linear reduction applied to every main-clock revolution above threshold
export const ENTROPY_TE_PENALTY_THRESHOLD = 0.4;   // entropy below this: no penalty
export const ENTROPY_TE_PENALTY_AT_THRESHOLD = 0.05; // -5% TE at threshold
export const ENTROPY_TE_PENALTY_AT_MAX = 0.25;       // -25% TE at entropy 1.0

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
export const TIMEDUST_BASE_YIELD = 1;           // TD awarded to main clock per overlap

// Temporal Surge — triggered when all three hands align at 12 o'clock
export const SURGE_THRESHOLD_DEG = 5;
export const SURGE_DURATION_MS = 30_000;
export const SURGE_SPEED_MULTIPLIER = 5;
export const SURGE_ENERGY_MULTIPLIER = 3;

// ── Prestige ──────────────────────────────────────────────────────────────────

export const PRESTIGE_COST_TD = 10;               // minimum TD required to prestige
export const PRESTIGE_ENTROPY_PP_SCALING = 0.01;  // K in: effectiveEntropy = 1 - (1 - raw)^(1 + ppSpent * K)

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

export const PRESTIGE_TD_BASE_COST = 20;          // Extra TD: +PRESTIGE_TD_BONUS yield per level
export const PRESTIGE_TD_SCALING = 1.5;
export const PRESTIGE_TD_BONUS = 0.20;            // +20% TD yield per level (cumulative additive)

export const PRESTIGE_ENTROPY_REDUCE_BASE_COST = 20; // Reduce Entropy Effects
export const PRESTIGE_ENTROPY_REDUCE_SCALING = 1.8;
export const PRESTIGE_ENTROPY_REDUCE_MAX = 10;    // at max: all negative entropy effects suppressed

// Tier 3 prestige upgrades — entropy flipped into a resource
// Bonuses are flat per level, but only activate above PRESTIGE_ENTROPY_BONUS_THRESHOLD.
export const PRESTIGE_ENTROPY_BONUS_THRESHOLD = 0.70; // entropy must exceed this for tier-3 bonuses

export const PRESTIGE_ENTROPY_TE_BASE_COST = 30;     // Temporal Resonance: TE bonus above threshold
export const PRESTIGE_ENTROPY_TE_SCALING = 2.0;
export const PRESTIGE_ENTROPY_TE_BONUS = 0.20;        // flat +20% TE per level when entropy ≥ threshold
export const PRESTIGE_ENTROPY_TE_MAX = 10;

export const PRESTIGE_ENTROPY_TD_BASE_COST = 30;     // Chaos Harvest: TD bonus above threshold
export const PRESTIGE_ENTROPY_TD_SCALING = 1.8;
export const PRESTIGE_ENTROPY_TD_BONUS = 0.20;        // flat +20% TD per level when entropy ≥ threshold
export const PRESTIGE_ENTROPY_TD_MAX = 10;

export const PRESTIGE_ASCEND_BASE_COST = 30;         // Entropy Ascendance: entropy coefficient in PP formula
export const PRESTIGE_ASCEND_COST_SCALING = 2.0;
export const PRESTIGE_ASCEND_BOOST = 0.10;            // +0.10 to entropy coefficient per level
export const PRESTIGE_ASCEND_MAX = 10;                // coefficient goes from 1.0 → 2.0 at max

// Tier 4 — Temporal Singularity
export const PRESTIGE_SINGULARITY_COST = 100;         // one-time purchase
export const PRESTIGE_SINGULARITY_SPEED_THRESHOLD = 100; // 100x = 10,000%; locks entropy to 1.0

// ── Reverse Time ─────────────────────────────────────────────────────────────

// Main clock randomly ticks backwards above this entropy threshold
export const REVERSE_ENTROPY_THRESHOLD = 0.6;
export const REVERSE_CHANCE_AT_THRESHOLD = 0.10;  // 10% at 60% entropy
export const REVERSE_CHANCE_AT_MAX = 0.15;         // 15% at 100% entropy
export const REVERSE_DURATION_AT_THRESHOLD = 2_000; // 2 s at threshold
export const REVERSE_DURATION_AT_MAX = 5_000;       // 5 s at max entropy

// ── System ────────────────────────────────────────────────────────────────────

export const AUTOSAVE_INTERVAL_MS = 5_000;
export const SAVE_KEY = 'chronoforge_save_v1';
export const MAX_OFFLINE_MS = 4 * 60 * 60 * 1_000; // 4 hours
