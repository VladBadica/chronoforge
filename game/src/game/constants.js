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

// Add Clock, Boost Clocks, and Anchor Time stay hidden in the upgrade panel
// until the player has prestiged this many times.
export const RUN_UPGRADES_UNLOCK_PRESTIGE_COUNT = 1;

// Temporal Studies research lab — hidden until this many lifetime prestiges.
export const RESEARCH_UNLOCK_PRESTIGE_COUNT = 2;

// Accelerate Time — increases main clock speed multiplier
export const UPGRADE_BASE_COST = 2;
export const UPGRADE_COST_EXPONENT = 1.3;
export const UPGRADE_SPEED_BONUS = 0.20;          // base speed bonus for level 1
export const UPGRADE_SPEED_BONUS_SCALING = 1.05;  // each level's bonus is 5% larger than the last

// Improve Time — increases TE per revolution
export const ENERGY_UPGRADE_BASE_COST = 2;
export const ENERGY_UPGRADE_COST_EXPONENT = 1.3;
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

// 100% entropy is reserved as the Singularity-override signal (see
// PRESTIGE_SINGULARITY_SPEED_THRESHOLD) that gates Ascension. Without
// Temporal Stabilization unlocked, entropy is capped just below the
// display-rounding threshold so it can never read as "100.0%".
export const ENTROPY_CAP_WITHOUT_SINGULARITY = 0.999;

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
export const FAST_TIME_UNLOCK_PRESTIGE_COUNT = 2; // event stays dormant until this many lifetime prestiges

// Time Fracture — TE loss when minute and hour hands overlap at high entropy
export const FRACTURE_ENTROPY_THRESHOLD = 0.4;
export const FRACTURE_LOSS_AT_THRESHOLD = 0.10;   // 10% TE lost at threshold entropy
export const FRACTURE_LOSS_AT_MAX = 0.40;         // 40% TE lost at entropy 1.0
export const FRACTURE_FLASH_MS = 2_000;

// TimeDust — earned when minute and hour hands overlap on any clock
export const TIMEDUST_THRESHOLD_DEG = 5;
export const TIMEDUST_BASE_YIELD = 1;           // TD awarded to main clock per overlap

// Temporal Surge — triggered when totalRevolutions crosses a multiple of 720
// (the instant all three hands align at 12 o'clock; see GameEngine._update)
export const SURGE_DURATION_MS = 30_000;
export const SURGE_SPEED_MULTIPLIER = 5;
export const SURGE_ENERGY_MULTIPLIER = 3;
export const SURGE_UNLOCK_PRESTIGE_COUNT = 4; // event stays dormant until this many lifetime prestiges

// ── Prestige ──────────────────────────────────────────────────────────────────

// Prestige upgrade tiers unlock progressively as the player accumulates lifetime
// prestiges — tier 1 is always available; tier N requires (N-1) prior prestiges.
export const PRESTIGE_TIER2_UNLOCK_PRESTIGE_COUNT = 1;
export const PRESTIGE_TIER3_UNLOCK_PRESTIGE_COUNT = 2;
export const PRESTIGE_TIER4_UNLOCK_PRESTIGE_COUNT = 3;

export const PRESTIGE_COST_TD = 5;                // minimum TD required to prestige
export const PRESTIGE_ENTROPY_PP_SCALING = 0.01;  // K in: effectiveEntropy = 1 - (1 - raw)^(1 + ppSpent * K)

// Costs paid in Prestige Points; scale exponentially per level
export const PRESTIGE_SPEED_BASE_COST = 2;        // P1: Start with Accelerate Time +1 lv
export const PRESTIGE_SPEED_SCALING = 1.1;
export const PRESTIGE_ENERGY_BASE_COST = 2;       // P2: Start with Improve Time +1 lv
export const PRESTIGE_ENERGY_SCALING = 1.1;
export const PRESTIGE_CLOCK_BASE_COST = 10;       // P3: Start with Add Clock +1 lv
export const PRESTIGE_CLOCK_SCALING = 3.0;
export const PRESTIGE_BOOST_BASE_COST = 2;        // P4: Start with Boost Clocks +1 lv
export const PRESTIGE_BOOST_SCALING = 1.2;
export const PRESTIGE_ANCHOR_BASE_COST = 2;       // P5: Start with Anchor Time +1 lv
export const PRESTIGE_ANCHOR_SCALING = 1.3;
export const PRESTIGE_MIRROR_BASE_COST = 15;      // Mirror Clocks: backward hand per clock
export const PRESTIGE_MIRROR_SCALING = 1.0;

export const PRESTIGE_TD_BASE_COST = 7;           // Extra TD: +PRESTIGE_TD_BONUS yield per level
export const PRESTIGE_TD_SCALING = 1.2;
export const PRESTIGE_TD_BONUS = 0.20;            // +20% TD yield per level (cumulative additive)

export const PRESTIGE_ENTROPY_REDUCE_BASE_COST = 7; // Reduce Entropy Effects
export const PRESTIGE_ENTROPY_REDUCE_SCALING = 1.1;
export const PRESTIGE_ENTROPY_REDUCE_MAX = 10;    // at max: all negative entropy effects suppressed

// Tier 3 prestige upgrades — entropy flipped into a resource
// Bonuses are flat per level, but only activate above PRESTIGE_ENTROPY_BONUS_THRESHOLD.
export const PRESTIGE_ENTROPY_BONUS_THRESHOLD = 0.70; // entropy must exceed this for tier-3 bonuses

export const PRESTIGE_ENTROPY_TE_BASE_COST = 10;     // Temporal Resonance: TE bonus above threshold
export const PRESTIGE_ENTROPY_TE_SCALING = 1.3;
export const PRESTIGE_ENTROPY_TE_BONUS = 0.20;        // flat +20% TE per level when entropy ≥ threshold
export const PRESTIGE_ENTROPY_TE_MAX = 10;

export const PRESTIGE_ENTROPY_TD_BASE_COST = 10;     // Chaos Harvest: TD bonus above threshold
export const PRESTIGE_ENTROPY_TD_SCALING = 1.3;
export const PRESTIGE_ENTROPY_TD_BONUS = 0.20;        // flat +20% TD per level when entropy ≥ threshold
export const PRESTIGE_ENTROPY_TD_MAX = 10;

export const PRESTIGE_ASCEND_BASE_COST = 10;         // Entropy Ascendance: entropy coefficient in PP formula
export const PRESTIGE_ASCEND_COST_SCALING = 1.3;
export const PRESTIGE_ASCEND_BOOST = 0.10;            // +0.10 to entropy coefficient per level
export const PRESTIGE_ASCEND_MAX = 10;                // coefficient goes from 1.0 → 2.0 at max

// Tier 4 — Temporal Stabilization (formerly Singularity)
export const PRESTIGE_SINGULARITY_COST = 100;         // one-time purchase
export const PRESTIGE_SINGULARITY_SPEED_THRESHOLD = 100; // 100x = 10,000%; locks entropy to 1.0

// ── Ascension ─────────────────────────────────────────────────────────────────
export const ASCEND_SPEED_THRESHOLD = 1000;           // 1000× = 100,000% required to ascend
export const ASCEND_SINGULARITY_PER_ENTROPY = 1;      // singularities gained per 100% entropy

// ── Reverse Time ─────────────────────────────────────────────────────────────

// Main clock randomly ticks backwards above this entropy threshold
export const REVERSE_ENTROPY_THRESHOLD = 0.6;
export const REVERSE_CHANCE_AT_THRESHOLD = 0.10;  // 10% at 60% entropy
export const REVERSE_CHANCE_AT_MAX = 0.15;         // 15% at 100% entropy
export const REVERSE_DURATION_AT_THRESHOLD = 2_000; // 2 s at threshold
export const REVERSE_DURATION_AT_MAX = 5_000;       // 5 s at max entropy

// Extra clock maintenance — TE/s drain proportional to accumulated bonus.
// Scale with the bonus so running a clock longer gets progressively more expensive.
export const CLOCK2_MAINTENANCE_RATE = 5;   // TE/s per unit of clock2SpeedBonus
export const CLOCK3_MAINTENANCE_RATE = 0.2;   // TE/s per unit of clock3TeBonus
export const CLOCK4_MAINTENANCE_RATE = 5;     // TE/s at full entropy reduction (0→1 scale)

// ── System ────────────────────────────────────────────────────────────────────

export const AUTOSAVE_INTERVAL_MS = 5_000;
export const SAVE_KEY = 'chronoforge_save_v1';
export const MAX_OFFLINE_MS = 4 * 60 * 60 * 1_000; // 4 hours
