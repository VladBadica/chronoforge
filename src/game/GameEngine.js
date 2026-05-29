// ---------------------------------------------------------------------------
// GameEngine — pure simulation class, no React, no rendering
//
// Responsibilities:
//   • Drive the requestAnimationFrame game loop
//   • Track elapsed angle of the second hand (degrees, 0–360)
//   • Count full revolutions and produce Time Energy
//   • Apply delta-time so the game runs correctly at any FPS / tab visibility
//   • Notify the Zustand store of state changes via callbacks
// ---------------------------------------------------------------------------

import {
  BASE_REVOLUTION_MS,
  ENERGY_PER_REVOLUTION,
  AUTOSAVE_INTERVAL_MS,
  SAVE_KEY,
  MAX_OFFLINE_MS,
  PRESTIGE_COST_TD,
  PRESTIGE_ENTROPY_PP_SCALING,
  PRESTIGE_SPEED_BASE_COST, PRESTIGE_SPEED_SCALING,
  PRESTIGE_ENERGY_BASE_COST, PRESTIGE_ENERGY_SCALING,
  PRESTIGE_CLOCK_BASE_COST, PRESTIGE_CLOCK_SCALING,
  PRESTIGE_BOOST_BASE_COST, PRESTIGE_BOOST_SCALING,
  PRESTIGE_ANCHOR_BASE_COST, PRESTIGE_ANCHOR_SCALING,
  PRESTIGE_MIRROR_BASE_COST, PRESTIGE_MIRROR_SCALING,
  PRESTIGE_TD_BASE_COST, PRESTIGE_TD_SCALING, PRESTIGE_TD_BONUS,
  PRESTIGE_ENTROPY_REDUCE_BASE_COST, PRESTIGE_ENTROPY_REDUCE_SCALING, PRESTIGE_ENTROPY_REDUCE_MAX,
  PRESTIGE_ENTROPY_BONUS_THRESHOLD,
  PRESTIGE_ENTROPY_TE_BASE_COST, PRESTIGE_ENTROPY_TE_SCALING, PRESTIGE_ENTROPY_TE_BONUS, PRESTIGE_ENTROPY_TE_MAX,
  PRESTIGE_ENTROPY_TD_BASE_COST, PRESTIGE_ENTROPY_TD_SCALING, PRESTIGE_ENTROPY_TD_BONUS, PRESTIGE_ENTROPY_TD_MAX,
  PRESTIGE_ASCEND_BASE_COST, PRESTIGE_ASCEND_COST_SCALING, PRESTIGE_ASCEND_BOOST, PRESTIGE_ASCEND_MAX,
  UPGRADE_BASE_COST,
  UPGRADE_COST_EXPONENT,
  UPGRADE_SPEED_BONUS,
  UPGRADE_SPEED_BONUS_SCALING,
  ENERGY_UPGRADE_BASE_COST,
  ENERGY_UPGRADE_COST_EXPONENT,
  ENERGY_UPGRADE_VALUE_BONUS,
  ENERGY_UPGRADE_VALUE_SCALING,
  CLOCK_UPGRADE_BASE_COST,
  CLOCK_UPGRADE_COST_EXPONENT,
  CLOCK_SPEED_FACTOR,
  CLOCK_MAX_EXTRA,
  CLOCK2_BASE_SPEED,
  CLOCK3_BASE_SPEED,
  CLOCK4_BASE_SPEED,
  CLOCK2_SPEED_BONUS,
  CLOCK3_TE_BONUS,
  CLOCK4_ENTROPY_REDUCTION,
  BOOST_UPGRADE_BASE_COST,
  BOOST_UPGRADE_COST_EXPONENT,
  BOOST_MAX_LEVEL,
  BOOST_SPEED_FACTOR_MAX,
  FAST_TIME_DURATION_MS,
  FAST_TIME_MULTIPLIER,
  FAST_TIME_DEBUFF_MULTIPLIER,
  FAST_TIME_THRESHOLD_DEG,
  ENTROPY_DEBUFF_THRESHOLD,
  ENTROPY_DEBUFF_CHANCE_MIN,
  ENTROPY_DEBUFF_CHANCE_MAX,
  ENTROPY_TE_PENALTY_THRESHOLD,
  ENTROPY_TE_PENALTY_AT_THRESHOLD,
  ENTROPY_TE_PENALTY_AT_MAX,
  FRACTURE_ENTROPY_THRESHOLD,
  FRACTURE_LOSS_AT_THRESHOLD,
  FRACTURE_LOSS_AT_MAX,
  FRACTURE_FLASH_MS,
  SURGE_DURATION_MS,
  SURGE_SPEED_MULTIPLIER,
  SURGE_ENERGY_MULTIPLIER,
  SURGE_THRESHOLD_DEG,
  TIMEDUST_THRESHOLD_DEG,
  TIMEDUST_BASE_YIELD,
  ENTROPY_BASE_STABILITY,
  ENTROPY_STABILITY_SCALING,
  STABILITY_UPGRADE_BASE_COST,
  STABILITY_UPGRADE_COST_EXPONENT,
  REVERSE_ENTROPY_THRESHOLD,
  REVERSE_CHANCE_AT_THRESHOLD,
  REVERSE_CHANCE_AT_MAX,
  REVERSE_DURATION_AT_THRESHOLD,
  REVERSE_DURATION_AT_MAX,
} from './constants.js';

export class GameEngine {
  constructor() {
    // --- simulation state (not React state) ---
    this._angle = 0;           // current second-hand angle in degrees (0–360)
    this._energy = 0;          // accumulated Time Energy
    this._speedLevel = 0;      // "Accelerate Time" upgrade level
    this._energyLevel = 0;     // "Improve Time" upgrade level
    this._clockCount = 1;        // total clocks (first is free)
    this._boostLevel = 0;        // "Boost Clocks" upgrade level
    this._stabilityLevel = 0;    // "Anchor Time" upgrade level
    this._extraAngles = [];      // angle per extra clock
    this._extraRevolutions = []; // revolution count per extra clock (for hand display)
    this._totalRevolutions = 0;

    // Fast Time state — transient, not saved
    this._fastTimeRemaining = 0;
    this._fastTimeIsDebuff = false;
    this._fractureFlash = 0;
    // Temporal Surge state — transient, not saved
    this._surgeRemaining = 0;
    // Reverse Time state — transient, not saved
    this._reverseTimeRemaining = 0;
    this._prevSurgeNear = [true]; // start true so the initial 12-o'clock doesn't trigger
    // Start all clocks as "already near" so the initial 12-o'clock position
    // doesn't immediately fire the event on the first frame.
    this._prevNear = [true];         // second vs minute; index 0 = main, i+1 = extra i
    this._prevHourMinNear = [true];  // minute vs hour;   same indexing

    // Special clock bonuses — saved, reset on prestige
    this._clock2SpeedBonus = 0;       // accumulated additive speed bonus from clock 2 revolutions
    this._clock3TeBonus = 0;          // accumulated TE/rev bonus from clock 3 revolutions
    this._clock4EntropyReduction = 0; // accumulated entropy reduction from clock 4 revolutions

    // TimeDust — saved
    this._timeDust = 0;

    // Prestige — saved, never reset by prestige itself
    this._prestigePoints = 0;
    this._lifetimePPSpent = 0;  // cumulative PP invested in upgrades across all runs
    this._prestigeSpeedLevel  = 0;
    this._prestigeEnergyLevel = 0;
    this._prestigeClockLevel  = 0;
    this._prestigeBoostLevel  = 0;
    this._prestigeAnchorLevel = 0;
    this._prestigeMirrorLevel = 0;
    this._prestigeTdLevel          = 0;
    this._prestigeEntropyReduceLevel = 0;
    this._prestigeEntropyTeLevel   = 0;
    this._prestigeEntropyTdLevel   = 0;
    this._prestigeAscendLevel      = 0;

    // --- loop bookkeeping ---
    this._rafId = null;
    this._lastTimestamp = null;
    this._lastSaveTimestamp = 0;

    // --- callback wired up by the store ---
    this._onTick = null;       // (snapshot) => void
  }

  // -------------------------------------------------------------------------
  // Public API
  // -------------------------------------------------------------------------

  /** Register the function the store calls each tick to sync React state */
  setTickCallback(fn) {
    this._onTick = fn;
  }

  /** Start (or restart) the animation loop */
  start() {
    if (this._rafId !== null) return;
    this._lastTimestamp = performance.now();
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  /** Pause the loop (used when tab is hidden or game is paused) */
  stop() {
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  /** Simulate one second of game time passing instantly — main clock only */
  addSecond() {
    this._update(1000, true);
  }

  /** Debug: inject energy directly */
  addEnergy(amount) {
    this._energy += amount;
    this._emitSnapshot();
  }

  /** Debug: inject time dust directly */
  addTimeDust(amount) {
    this._timeDust += amount;
    this._emitSnapshot();
  }

  /** Wipe all state and localStorage — returns the engine to a fresh start */
  reset() {
    this._angle = 0;
    this._energy = 0;
    this._speedLevel = 0;
    this._energyLevel = 0;
    this._clockCount = 1;
    this._boostLevel = 0;
    this._stabilityLevel = 0;
    this._extraAngles = [];
    this._extraRevolutions = [];
    this._totalRevolutions = 0;
    this._fastTimeRemaining = 0;
    this._fastTimeIsDebuff = false;
    this._fractureFlash = 0;
    this._surgeRemaining = 0;
    this._reverseTimeRemaining = 0;
    this._prevNear = [true];
    this._prevHourMinNear = [true];
    this._prevSurgeNear = [true];
    this._clock2SpeedBonus = 0;
    this._clock3TeBonus = 0;
    this._clock4EntropyReduction = 0;
    this._timeDust = 0;
    this._prestigePoints = 0;
    this._lifetimePPSpent = 0;
    this._prestigeSpeedLevel  = 0;
    this._prestigeEnergyLevel = 0;
    this._prestigeClockLevel  = 0;
    this._prestigeBoostLevel  = 0;
    this._prestigeAnchorLevel = 0;
    this._prestigeMirrorLevel = 0;
    this._prestigeTdLevel          = 0;
    this._prestigeEntropyReduceLevel = 0;
    this._prestigeEntropyTeLevel   = 0;
    this._prestigeEntropyTdLevel   = 0;
    this._prestigeAscendLevel      = 0;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch { /* ignore */ }
    this._emitSnapshot();
  }

  /** Prestige — converts TD to PP and resets all non-prestige progress */
  prestige() {
    if (this._timeDust < PRESTIGE_COST_TD) return false;
    const ppEntropyCoeff = 1 + this._prestigeAscendLevel * PRESTIGE_ASCEND_BOOST;
    this._prestigePoints += Math.floor(this._timeDust * (1 + this.getEntropy() * ppEntropyCoeff));
    this._angle = 0;
    this._energy = 0;
    this._speedLevel = this._prestigeSpeedLevel;
    this._energyLevel = this._prestigeEnergyLevel;
    this._clockCount = 1 + this._prestigeClockLevel;
    this._boostLevel = this._prestigeBoostLevel;
    this._stabilityLevel = this._prestigeAnchorLevel;
    this._extraAngles = Array(this._prestigeClockLevel).fill(0);
    this._extraRevolutions = Array(this._prestigeClockLevel).fill(0);
    this._totalRevolutions = 0;
    this._fastTimeRemaining = 0;
    this._fastTimeIsDebuff = false;
    this._fractureFlash = 0;
    this._surgeRemaining = 0;
    this._reverseTimeRemaining = 0;
    this._prevNear = Array(this._clockCount).fill(true);
    this._prevHourMinNear = Array(this._clockCount).fill(true);
    this._prevSurgeNear = Array(this._clockCount).fill(true);
    this._clock2SpeedBonus = 0;
    this._clock3TeBonus = 0;
    this._clock4EntropyReduction = 0;
    this._timeDust = 0;
    this.save();
    this._emitSnapshot();
    return true;
  }

  // ---- Prestige upgrade buy/cost helpers (one pair per upgrade) ----

  _buyPrestigeUpgrade(costFn, levelProp, onBuy = null) {
    const cost = costFn.call(this);
    if (this._prestigePoints < cost) return false;
    this._prestigePoints -= cost;
    this._lifetimePPSpent += cost;
    this[levelProp] += 1;
    if (onBuy) onBuy.call(this);
    this._emitSnapshot();
    return true;
  }

  _prestigeCost(base, scaling, level) {
    return Math.ceil(base * Math.pow(scaling, level));
  }

  buyPrestigeSpeed() {
    return this._buyPrestigeUpgrade(this.getPrestigeSpeedCost, '_prestigeSpeedLevel', function() {
      this._speedLevel += 1;
    });
  }

  buyPrestigeEnergy() {
    return this._buyPrestigeUpgrade(this.getPrestigeEnergyCost, '_prestigeEnergyLevel', function() {
      this._energyLevel += 1;
    });
  }

  buyPrestigeClock() {
    if (this._clockCount >= 1 + CLOCK_MAX_EXTRA) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeClockCost, '_prestigeClockLevel', function() {
      this._clockCount += 1;
      this._extraAngles.push(0);
      this._extraRevolutions.push(0);
      this._prevNear.push(true);
      this._prevHourMinNear.push(true);
      this._prevSurgeNear.push(true);
    });
  }

  buyPrestigeBoost() {
    if (this._boostLevel >= BOOST_MAX_LEVEL) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeBoostCost, '_prestigeBoostLevel', function() {
      this._boostLevel += 1;
    });
  }

  buyPrestigeAnchor() {
    return this._buyPrestigeUpgrade(this.getPrestigeAnchorCost, '_prestigeAnchorLevel', function() {
      this._stabilityLevel += 1;
    });
  }

  buyPrestigeMirror() {
    if (this._prestigeMirrorLevel >= CLOCK_MAX_EXTRA) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeMirrorCost, '_prestigeMirrorLevel');
  }

  getPrestigeSpeedCost()  { return this._prestigeCost(PRESTIGE_SPEED_BASE_COST,  PRESTIGE_SPEED_SCALING,  this._prestigeSpeedLevel);  }
  getPrestigeEnergyCost() { return this._prestigeCost(PRESTIGE_ENERGY_BASE_COST, PRESTIGE_ENERGY_SCALING, this._prestigeEnergyLevel); }
  getPrestigeClockCost()  { return this._prestigeCost(PRESTIGE_CLOCK_BASE_COST,  PRESTIGE_CLOCK_SCALING,  this._prestigeClockLevel);  }
  getPrestigeBoostCost()  { return this._prestigeCost(PRESTIGE_BOOST_BASE_COST,  PRESTIGE_BOOST_SCALING,  this._prestigeBoostLevel);  }
  getPrestigeAnchorCost() { return this._prestigeCost(PRESTIGE_ANCHOR_BASE_COST, PRESTIGE_ANCHOR_SCALING, this._prestigeAnchorLevel); }
  getPrestigeMirrorCost() { return this._prestigeCost(PRESTIGE_MIRROR_BASE_COST, PRESTIGE_MIRROR_SCALING, this._prestigeMirrorLevel); }

  buyPrestigeTd() {
    return this._buyPrestigeUpgrade(this.getPrestigeTdCost, '_prestigeTdLevel');
  }

  buyPrestigeEntropyReduce() {
    if (this._prestigeEntropyReduceLevel >= PRESTIGE_ENTROPY_REDUCE_MAX) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeEntropyReduceCost, '_prestigeEntropyReduceLevel');
  }

  getPrestigeTdCost()            { return this._prestigeCost(PRESTIGE_TD_BASE_COST,            PRESTIGE_TD_SCALING,            this._prestigeTdLevel); }
  getPrestigeEntropyReduceCost() { return this._prestigeCost(PRESTIGE_ENTROPY_REDUCE_BASE_COST, PRESTIGE_ENTROPY_REDUCE_SCALING, this._prestigeEntropyReduceLevel); }

  /** Scaling factor applied to all negative entropy effects (1 = full, 0 = none). */
  _entropyReduceFactor() {
    return 1 - this._prestigeEntropyReduceLevel / PRESTIGE_ENTROPY_REDUCE_MAX;
  }

  buyPrestigeEntropyTe() {
    if (this._prestigeEntropyTeLevel >= PRESTIGE_ENTROPY_TE_MAX) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeEntropyTeCost, '_prestigeEntropyTeLevel');
  }

  buyPrestigeEntropyTd() {
    if (this._prestigeEntropyTdLevel >= PRESTIGE_ENTROPY_TD_MAX) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeEntropyTdCost, '_prestigeEntropyTdLevel');
  }

  buyPrestigeAscend() {
    if (this._prestigeAscendLevel >= PRESTIGE_ASCEND_MAX) return false;
    return this._buyPrestigeUpgrade(this.getPrestigeAscendCost, '_prestigeAscendLevel');
  }

  getPrestigeEntropyTeCost() { return this._prestigeCost(PRESTIGE_ENTROPY_TE_BASE_COST, PRESTIGE_ENTROPY_TE_SCALING, this._prestigeEntropyTeLevel); }
  getPrestigeEntropyTdCost() { return this._prestigeCost(PRESTIGE_ENTROPY_TD_BASE_COST, PRESTIGE_ENTROPY_TD_SCALING, this._prestigeEntropyTdLevel); }
  getPrestigeAscendCost()    { return this._prestigeCost(PRESTIGE_ASCEND_BASE_COST,     PRESTIGE_ASCEND_COST_SCALING, this._prestigeAscendLevel); }

  /**
   * Combined TE multiplier: base 1.0, minus entropy penalty, plus entropy bonus from Temporal Resonance.
   * Can exceed 1.0 at high entropy with high Temporal Resonance levels.
   */
  getEntropyTeMultiplier() {
    const entropy = this.getEntropy();
    const bonus = entropy >= PRESTIGE_ENTROPY_BONUS_THRESHOLD
      ? this._prestigeEntropyTeLevel * PRESTIGE_ENTROPY_TE_BONUS
      : 0;
    return Math.max(0, 1 - this.getEntropyTePenalty() + bonus);
  }

  /** Buy one level of the speed upgrade — returns false if not enough energy */
  buyUpgrade() {
    const cost = this.getUpgradeCost();
    if (this._energy < cost) return false;
    this._energy -= cost;
    this._speedLevel += 1;
    this._emitSnapshot();
    return true;
  }

  /** Computed upgrade cost for the *next* Accelerate Time purchase */
  getUpgradeCost() {
    return Math.floor(
      UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_EXPONENT, this._speedLevel - this._prestigeSpeedLevel)
    );
  }

  /** Clock speed multiplier — bonus per level scales by UPGRADE_SPEED_BONUS_SCALING */
  getSpeedMultiplier() {
    return this._speedMultiplierAt(this._speedLevel);
  }

  _speedMultiplierAt(level) {
    let bonus = 0;
    for (let i = 0; i < level; i++) {
      bonus += UPGRADE_SPEED_BONUS * Math.pow(UPGRADE_SPEED_BONUS_SCALING, i);
    }
    return 1 + bonus;
  }

  /** Purchase one additional clock — returns false if not enough energy or at max */
  buyClockUpgrade() {
    if (this._clockCount >= 1 + CLOCK_MAX_EXTRA) return false;
    const cost = this.getClockUpgradeCost();
    if (this._energy < cost) return false;
    this._energy -= cost;
    this._clockCount += 1;
    this._extraAngles.push(0);
    this._extraRevolutions.push(0);
    // New clock starts at 0 (all hands overlapping) — mark near so no immediate trigger.
    this._prevNear.push(true);
    this._prevHourMinNear.push(true);
    this._prevSurgeNear.push(true);
    this._emitSnapshot();
    return true;
  }

  /** Computed cost for the next clock purchase */
  getClockUpgradeCost() {
    const boughtExtras = (this._clockCount - 1) - this._prestigeClockLevel;
    return Math.floor(
      CLOCK_UPGRADE_BASE_COST * Math.pow(CLOCK_UPGRADE_COST_EXPONENT, boughtExtras)
    );
  }

  /** Purchase one level of Boost Clocks — returns false if not enough energy or at max level */
  buyBoostUpgrade() {
    if (this._boostLevel >= BOOST_MAX_LEVEL) return false;
    const cost = this.getBoostUpgradeCost();
    if (this._energy < cost) return false;
    this._energy -= cost;
    this._boostLevel += 1;
    this._emitSnapshot();
    return true;
  }

  /** Computed cost for the next Boost Clocks purchase */
  getBoostUpgradeCost() {
    return Math.floor(
      BOOST_UPGRADE_BASE_COST * Math.pow(BOOST_UPGRADE_COST_EXPONENT, this._boostLevel - this._prestigeBoostLevel)
    );
  }

  /**
   * Base speed factor for extra clocks — bonus per level scales by BOOST_SPEED_BONUS_SCALING.
   * Extra clock i runs at getExtraClockSpeedFactor() * CLOCK_SPEED_FACTOR^i.
   */
  getExtraClockSpeedFactor() {
    return this._extraClockFactorAt(this._boostLevel);
  }

  _extraClockFactorAt(level) {
    const clampedLevel = Math.min(level, BOOST_MAX_LEVEL);
    return CLOCK_SPEED_FACTOR + clampedLevel * (BOOST_SPEED_FACTOR_MAX - CLOCK_SPEED_FACTOR) / BOOST_MAX_LEVEL;
  }

  /** Purchase one level of Anchor Time — returns false if not enough energy */
  buyStabilityUpgrade() {
    const cost = this.getStabilityUpgradeCost();
    if (this._energy < cost) return false;
    this._energy -= cost;
    this._stabilityLevel += 1;
    this._emitSnapshot();
    return true;
  }

  /** Computed cost for the next Anchor Time purchase */
  getStabilityUpgradeCost() {
    return Math.floor(
      STABILITY_UPGRADE_BASE_COST * Math.pow(STABILITY_UPGRADE_COST_EXPONENT, this._stabilityLevel - this._prestigeAnchorLevel)
    );
  }

  /** Stability denominator at a given upgrade level */
  _stabilityAt(level) {
    return ENTROPY_BASE_STABILITY * Math.pow(ENTROPY_STABILITY_SCALING, level);
  }

  /** Raw entropy for a given stability level, before PP scaling */
  _rawEntropyAt(stabilityLevel) {
    const excess = this.getSpeedMultiplier() + this._clock2SpeedBonus - 1;
    if (excess <= 0) return 0;
    const stability = this._stabilityAt(stabilityLevel);
    return Math.max(0, excess / (excess + stability) - this._clock4EntropyReduction);
  }

  /** Effective entropy = 1 − (1 − raw)^(1 + ppSpent × K) — stays in [0, 1] */
  _entropyAt(stabilityLevel) {
    const raw = this._rawEntropyAt(stabilityLevel);
    const exponent = 1 + this._lifetimePPSpent * PRESTIGE_ENTROPY_PP_SCALING;
    return 1 - Math.pow(1 - raw, exponent);
  }

  /** Current Time Entropy — 0 (stable) to 1 (total chaos) */
  getEntropy() {
    return this._entropyAt(this._stabilityLevel);
  }

  /** TE multiplier penalty from entropy — 0 (no penalty) to ENTROPY_TE_PENALTY_AT_MAX */
  getEntropyTePenalty() {
    const entropy = this.getEntropy();
    if (entropy < ENTROPY_TE_PENALTY_THRESHOLD) return 0;
    const t = (entropy - ENTROPY_TE_PENALTY_THRESHOLD) / (1 - ENTROPY_TE_PENALTY_THRESHOLD);
    const base = ENTROPY_TE_PENALTY_AT_THRESHOLD + t * (ENTROPY_TE_PENALTY_AT_MAX - ENTROPY_TE_PENALTY_AT_THRESHOLD);
    return base * this._entropyReduceFactor();
  }

  /** Buy one level of the Improve Time upgrade — returns false if not enough energy */
  buyEnergyUpgrade() {
    const cost = this.getEnergyUpgradeCost();
    if (this._energy < cost) return false;
    this._energy -= cost;
    this._energyLevel += 1;
    this._emitSnapshot();
    return true;
  }

  /** Computed upgrade cost for the *next* Improve Time purchase */
  getEnergyUpgradeCost() {
    return Math.floor(
      ENERGY_UPGRADE_BASE_COST * Math.pow(ENERGY_UPGRADE_COST_EXPONENT, this._energyLevel - this._prestigeEnergyLevel)
    );
  }

  /** TE earned per full revolution — includes upgrade levels and clock 3 accumulated bonus */
  getEnergyPerRevolution() {
    return this._energyPerRevAt(this._energyLevel) + this._clock3TeBonus;
  }

  _energyPerRevAt(level) {
    let bonus = 0;
    for (let i = 0; i < level; i++) {
      bonus += ENERGY_UPGRADE_VALUE_BONUS * Math.pow(ENERGY_UPGRADE_VALUE_SCALING, i);
    }
    return ENERGY_PER_REVOLUTION + bonus;
  }

  /** Energy produced per real second across all clocks at current upgrade levels */
  getEnergyPerSecond(includeFastTime = false) {
    const fastMult = includeFastTime && this._fastTimeRemaining > 0
      ? (this._fastTimeIsDebuff ? FAST_TIME_DEBUFF_MULTIPLIER : FAST_TIME_MULTIPLIER)
      : 1;
    const surgeMult = includeFastTime && this._surgeRemaining > 0 ? SURGE_SPEED_MULTIPLIER : 1;
    const surgeEnergyMult = includeFastTime && this._surgeRemaining > 0 ? SURGE_ENERGY_MULTIPLIER : 1;
    const mainRPS = (1000 / BASE_REVOLUTION_MS) * (this.getSpeedMultiplier() + this._clock2SpeedBonus) * fastMult * surgeMult;
    const energyPerRev = this.getEnergyPerRevolution();
    const mainMirrorMult = this._prestigeMirrorLevel >= 1 ? 2 : 1;
    return mainRPS * energyPerRev * surgeEnergyMult * mainMirrorMult * this.getEntropyTeMultiplier();
  }

  // -------------------------------------------------------------------------
  // Save / Load
  // -------------------------------------------------------------------------

  save() {
    const data = {
      energy: this._energy,
      speedLevel: this._speedLevel,
      energyLevel: this._energyLevel,
      clockCount: this._clockCount,
      boostLevel: this._boostLevel,
      stabilityLevel: this._stabilityLevel,
      clock2SpeedBonus: this._clock2SpeedBonus,
      clock3TeBonus: this._clock3TeBonus,
      clock4EntropyReduction: this._clock4EntropyReduction,
      timeDust: this._timeDust,
      prestigePoints: this._prestigePoints,
      lifetimePPSpent: this._lifetimePPSpent,
      prestigeSpeedLevel:  this._prestigeSpeedLevel,
      prestigeEnergyLevel: this._prestigeEnergyLevel,
      prestigeClockLevel:  this._prestigeClockLevel,
      prestigeBoostLevel:  this._prestigeBoostLevel,
      prestigeAnchorLevel: this._prestigeAnchorLevel,
      prestigeMirrorLevel: this._prestigeMirrorLevel,
      prestigeTdLevel: this._prestigeTdLevel,
      prestigeEntropyReduceLevel: this._prestigeEntropyReduceLevel,
      prestigeEntropyTeLevel: this._prestigeEntropyTeLevel,
      prestigeEntropyTdLevel: this._prestigeEntropyTdLevel,
      prestigeAscendLevel:    this._prestigeAscendLevel,
      totalRevolutions: this._totalRevolutions,
      extraRevolutions: this._extraRevolutions,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Silently ignore storage errors (private browsing, quota exceeded, etc.)
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      this._energy = data.energy ?? 0;
      this._speedLevel = data.speedLevel ?? 0;
      this._energyLevel = data.energyLevel ?? 0;
      this._clockCount = data.clockCount ?? 1;
      this._boostLevel = data.boostLevel ?? 0;
      this._stabilityLevel = data.stabilityLevel ?? 0;
      const extras = this._clockCount - 1;
      this._extraAngles = Array(extras).fill(0);
      this._extraRevolutions = Array.isArray(data.extraRevolutions) && data.extraRevolutions.length === extras
        ? data.extraRevolutions.slice()
        : Array(extras).fill(0);
      this._clock2SpeedBonus = data.clock2SpeedBonus ?? 0;
      this._clock3TeBonus = data.clock3TeBonus ?? 0;
      this._clock4EntropyReduction = data.clock4EntropyReduction ?? 0;
      this._timeDust = data.timeDust ?? 0;
      this._prestigePoints = data.prestigePoints ?? 0;
      this._lifetimePPSpent = data.lifetimePPSpent ?? 0;
      this._prestigeSpeedLevel  = data.prestigeSpeedLevel  ?? 0;
      this._prestigeEnergyLevel = data.prestigeEnergyLevel ?? 0;
      this._prestigeClockLevel  = data.prestigeClockLevel  ?? 0;
      this._prestigeBoostLevel  = data.prestigeBoostLevel  ?? 0;
      this._prestigeAnchorLevel = data.prestigeAnchorLevel ?? 0;
      this._prestigeMirrorLevel = data.prestigeMirrorLevel ?? 0;
      this._prestigeTdLevel          = data.prestigeTdLevel ?? 0;
      this._prestigeEntropyReduceLevel = data.prestigeEntropyReduceLevel ?? 0;
      this._prestigeEntropyTeLevel   = data.prestigeEntropyTeLevel ?? 0;
      this._prestigeEntropyTdLevel   = data.prestigeEntropyTdLevel ?? 0;
      this._prestigeAscendLevel      = data.prestigeAscendLevel ?? 0;
      this._fastTimeRemaining = 0;
      this._surgeRemaining = 0;
      this._prevNear = Array(this._clockCount).fill(true);
      this._prevHourMinNear = Array(this._clockCount).fill(true);
      this._prevSurgeNear = Array(this._clockCount).fill(true);
      this._totalRevolutions = data.totalRevolutions ?? 0;

      // --- Offline progress ---
      // Calculate how long the player was away and credit the energy they
      // would have earned if the game had kept running.
      if (data.savedAt) {
        const awayMs = Math.min(Date.now() - data.savedAt, MAX_OFFLINE_MS);
        if (awayMs > 0) {
          const offlineEnergy = (awayMs / 1000) * this.getEnergyPerSecond();
          this._energy += offlineEnergy;
        }
      }
    } catch {
      // Corrupt save — start fresh
    }
  }

  // -------------------------------------------------------------------------
  // Internal loop
  // -------------------------------------------------------------------------

  /**
   * Core game loop — called by requestAnimationFrame each frame.
   *
   * Delta-time design:
   *   All simulation is expressed in real-world milliseconds elapsed since
   *   the last frame (deltaMs).  This means:
   *     • 60 fps or 30 fps — identical results
   *     • Tab throttled to 1 fps — still accurate
   *     • Browser paused — offline progress handles the gap
   *
   *   We convert deltaMs → degrees rotated using the clock's period:
   *     degreesPerMs = 360 / (BASE_REVOLUTION_MS / speedMultiplier)
   */
  _loop(timestamp) {
    // deltaMs: time since last frame, capped at 1 second to avoid a huge
    // jump when the tab regains focus after a brief period of inactivity.
    const deltaMs = Math.min(timestamp - (this._lastTimestamp ?? timestamp), 1000);
    this._lastTimestamp = timestamp;

    this._update(deltaMs);

    // Autosave on interval
    if (timestamp - this._lastSaveTimestamp >= AUTOSAVE_INTERVAL_MS) {
      this.save();
      this._lastSaveTimestamp = timestamp;
    }

    // Schedule next frame
    this._rafId = requestAnimationFrame(this._loop.bind(this));
  }

  _update(deltaMs, skipExtraClocks = false) {
    // Decrement timers before this frame's physics.
    this._fastTimeRemaining = Math.max(0, this._fastTimeRemaining - deltaMs);
    this._fractureFlash = Math.max(0, this._fractureFlash - deltaMs);
    this._surgeRemaining = Math.max(0, this._surgeRemaining - deltaMs);
    this._reverseTimeRemaining = Math.max(0, this._reverseTimeRemaining - deltaMs);
    const isFastTime = this._fastTimeRemaining > 0;
    const isSurge = this._surgeRemaining > 0;
    const isReverse = this._reverseTimeRemaining > 0;
    // While reversing, the slowdown debuff inverts into a speed-up (going backwards faster).
    const fastTimeMult = isFastTime
      ? (this._fastTimeIsDebuff
          ? (isReverse ? FAST_TIME_MULTIPLIER : FAST_TIME_DEBUFF_MULTIPLIER)
          : FAST_TIME_MULTIPLIER)
      : 1;

    const speedMult = (this.getSpeedMultiplier() + this._clock2SpeedBonus) * fastTimeMult * (isSurge ? SURGE_SPEED_MULTIPLIER : 1);
    const surgeEnergyMult = isSurge ? SURGE_ENERGY_MULTIPLIER : 1;
    const degreesPerMs = 360 / (BASE_REVOLUTION_MS / speedMult);
    const deltaDegrees = degreesPerMs * deltaMs;

    if (isReverse) {
      // Tick the main clock backwards, undoing progress.
      const prevAngle = this._angle;
      const rawPosition = prevAngle - deltaDegrees; // can be negative
      this._angle = ((rawPosition % 360) + 360) % 360;

      // Each time rawPosition crosses below a multiple of 360 from above, a
      // reverse revolution completes and we subtract energy.
      const reverseCrossings = rawPosition < 0
        ? Math.ceil(-rawPosition / 360)
        : Math.floor(prevAngle / 360) - Math.floor(rawPosition / 360);
      if (reverseCrossings > 0) {
        const mirrorMult = this._prestigeMirrorLevel >= 1 ? 2 : 1;
        const teMult = this.getEntropyTeMultiplier() * surgeEnergyMult * mirrorMult;
        this._energy = Math.max(0, this._energy - reverseCrossings * this.getEnergyPerRevolution() * teMult);
        this._totalRevolutions = Math.max(0, this._totalRevolutions - reverseCrossings);
      }
    } else {
      const prevAngle = this._angle;
      this._angle = (prevAngle + deltaDegrees) % 360;

      const crossings = Math.floor((prevAngle + deltaDegrees) / 360);
      if (crossings > 0) {
        const mirrorMult = this._prestigeMirrorLevel >= 1 ? 2 : 1;
        const teMult = this.getEntropyTeMultiplier() * surgeEnergyMult * mirrorMult;
        this._energy += crossings * this.getEnergyPerRevolution() * teMult;
        this._totalRevolutions += crossings;

        // Roll for reverse trigger once we complete a forward revolution.
        const entropy = this.getEntropy();
        if (entropy >= REVERSE_ENTROPY_THRESHOLD) {
          const t = (entropy - REVERSE_ENTROPY_THRESHOLD) / (1 - REVERSE_ENTROPY_THRESHOLD);
          const chance = (REVERSE_CHANCE_AT_THRESHOLD + t * (REVERSE_CHANCE_AT_MAX - REVERSE_CHANCE_AT_THRESHOLD)) * this._entropyReduceFactor();
          if (Math.random() < chance) {
            const duration = REVERSE_DURATION_AT_THRESHOLD + t * (REVERSE_DURATION_AT_MAX - REVERSE_DURATION_AT_THRESHOLD);
            this._reverseTimeRemaining = duration;
          }
        }
      }

      // Fast Time, TimeDust, Temporal Surge — main clock only (not while reversing).
      this._checkOverlap(0, this._angle, this._totalRevolutions);
      this._checkHourMinuteOverlap(0, this._angle, this._totalRevolutions, TIMEDUST_BASE_YIELD);
      this._checkAllHandsAtTwelve(0, this._angle, this._totalRevolutions);
    }

    if (!skipExtraClocks) {
      // Extra clocks: base speeds are [0.1, 0.05, 0.01] scaled by boost ratio
      const EXTRA_BASE_SPEEDS = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
      const boostRatio = this.getExtraClockSpeedFactor() / CLOCK_SPEED_FACTOR;
      for (let i = 0; i < this._extraAngles.length; i++) {
        const factor = EXTRA_BASE_SPEEDS[i] * boostRatio;
        const extraDelta = deltaDegrees * factor;
        const prevExtra = this._extraAngles[i];
        this._extraAngles[i] = (prevExtra + extraDelta) % 360;
        const extraCrossings = Math.floor((prevExtra + extraDelta) / 360);
        if (extraCrossings > 0) {
          this._extraRevolutions[i] += extraCrossings;
          if (i === 0) {
            this._clock2SpeedBonus += extraCrossings * CLOCK2_SPEED_BONUS;
          } else if (i === 1) {
            this._clock3TeBonus += extraCrossings * CLOCK3_TE_BONUS;
          } else if (i === 2) {
            this._clock4EntropyReduction = Math.min(1, this._clock4EntropyReduction + extraCrossings * CLOCK4_ENTROPY_REDUCTION);
          }
        }
      }
    }

    this._emitSnapshot();
  }

  _checkHourMinuteOverlap(slotIndex, secondAngle, totalRevs, yieldMult = 1) {
    const minuteAngle = ((totalRevs % 60) + secondAngle / 360) * 6;
    const hourAngle = ((totalRevs % 720) + secondAngle / 360) * 0.5;
    const diff = Math.abs(minuteAngle - hourAngle) % 360;
    const distance = Math.min(diff, 360 - diff);
    const isNear = distance < TIMEDUST_THRESHOLD_DEG;

    if (isNear && !this._prevHourMinNear[slotIndex]) {
      const entropy = this.getEntropy();
      const entropyTdBonus = entropy >= PRESTIGE_ENTROPY_BONUS_THRESHOLD
        ? this._prestigeEntropyTdLevel * PRESTIGE_ENTROPY_TD_BONUS
        : 0;
      const tdMult = (1 + this._prestigeTdLevel * PRESTIGE_TD_BONUS) * (1 + entropyTdBonus);
      this._timeDust += yieldMult * tdMult;
      if (entropy >= FRACTURE_ENTROPY_THRESHOLD) {
        const t = (entropy - FRACTURE_ENTROPY_THRESHOLD) / (1 - FRACTURE_ENTROPY_THRESHOLD);
        const lossRate = (FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD)) * this._entropyReduceFactor();
        if (lossRate > 0) {
          this._energy = Math.max(0, this._energy * (1 - lossRate));
          this._fractureFlash = FRACTURE_FLASH_MS;
        }
      }
    }
    this._prevHourMinNear[slotIndex] = isNear;
  }

  _checkOverlap(slotIndex, secondAngle, totalRevs) {
    const minuteAngle = ((totalRevs % 60) + secondAngle / 360) * 6;
    const diff = Math.abs(secondAngle - minuteAngle) % 360;
    const distance = Math.min(diff, 360 - diff);
    const isNear = distance < FAST_TIME_THRESHOLD_DEG;

    if (isNear && !this._prevNear[slotIndex]) {
      const entropy = this.getEntropy();
      const debuffChance = entropy >= ENTROPY_DEBUFF_THRESHOLD
        ? (ENTROPY_DEBUFF_CHANCE_MIN + (entropy - ENTROPY_DEBUFF_THRESHOLD) / (1 - ENTROPY_DEBUFF_THRESHOLD) * (ENTROPY_DEBUFF_CHANCE_MAX - ENTROPY_DEBUFF_CHANCE_MIN)) * this._entropyReduceFactor()
        : 0;
      this._fastTimeIsDebuff = Math.random() < debuffChance;
      this._fastTimeRemaining = FAST_TIME_DURATION_MS;
    }
    this._prevNear[slotIndex] = isNear;
  }

  _checkAllHandsAtTwelve(slotIndex, secondAngle, totalRevs) {
    const minuteAngle = ((totalRevs % 60) + secondAngle / 360) * 6;
    const hourAngle = ((totalRevs % 720) + secondAngle / 360) * 0.5;
    const secondDist = Math.min(secondAngle, 360 - secondAngle);
    const minuteDist = Math.min(minuteAngle, 360 - minuteAngle);
    const hourDist = Math.min(hourAngle, 360 - hourAngle);
    const isNear = secondDist < SURGE_THRESHOLD_DEG && minuteDist < SURGE_THRESHOLD_DEG && hourDist < SURGE_THRESHOLD_DEG;

    if (isNear && !this._prevSurgeNear[slotIndex]) {
      this._surgeRemaining = SURGE_DURATION_MS;
    }
    this._prevSurgeNear[slotIndex] = isNear;
  }

  /** Push a lightweight snapshot to the store each frame */
  _emitSnapshot() {
    if (this._onTick) {
      this._onTick({
        angle: this._angle,
        energy: this._energy,
        speedLevel: this._speedLevel,
        speedMultiplier: this.getSpeedMultiplier() + this._clock2SpeedBonus,
        nextSpeedMultiplier: this._speedMultiplierAt(this._speedLevel + 1) + this._clock2SpeedBonus,
        energyPerSecond: this.getEnergyPerSecond(true),
        upgradeCost: this.getUpgradeCost(),
        energyLevel: this._energyLevel,
        energyPerRevolution: this.getEnergyPerRevolution(),
        nextEnergyPerRevolution: this._energyPerRevAt(this._energyLevel + 1) + this._clock3TeBonus,
        energyUpgradeCost: this.getEnergyUpgradeCost(),
        clockCount: this._clockCount,
        clockAtMax: this._clockCount >= 1 + CLOCK_MAX_EXTRA,
        clock2SpeedBonus: this._clock2SpeedBonus,
        clock3TeBonus: this._clock3TeBonus,
        clock4EntropyReduction: this._clock4EntropyReduction,
        boostLevel: this._boostLevel,
        boostAtMax: this._boostLevel >= BOOST_MAX_LEVEL,
        extraClockSpeedFactor: this.getExtraClockSpeedFactor(),
        nextExtraClockSpeedFactor: this._extraClockFactorAt(this._boostLevel + 1),
        extraAngles: this._extraAngles.slice(),
        extraRevolutions: this._extraRevolutions.slice(),
        clockUpgradeCost: this.getClockUpgradeCost(),
        boostUpgradeCost: this.getBoostUpgradeCost(),
        isFastTime: this._fastTimeRemaining > 0,
        isFracture: this._fractureFlash > 0,
        isSurge: this._surgeRemaining > 0,
        surgeRemaining: this._surgeRemaining,
        fastTimeIsDebuff: this._fastTimeIsDebuff,
        fastTimeRemaining: this._fastTimeRemaining,
        isReverse: this._reverseTimeRemaining > 0,
        reverseTimeRemaining: this._reverseTimeRemaining,
        totalRevolutions: this._totalRevolutions,
        timeDust: this._timeDust,
        prestigePoints: this._prestigePoints,
        lifetimePPSpent: this._lifetimePPSpent,
        canPrestige: this._timeDust >= PRESTIGE_COST_TD,
        entropy: this.getEntropy(),
        nextEntropy: this._entropyAt(this._stabilityLevel + 1),
        entropyTePenalty: this.getEntropyTePenalty(),
        stabilityLevel: this._stabilityLevel,
        stabilityUpgradeCost: this.getStabilityUpgradeCost(),
        prestigeSpeedLevel:  this._prestigeSpeedLevel,
        prestigeEnergyLevel: this._prestigeEnergyLevel,
        prestigeClockLevel:  this._prestigeClockLevel,
        prestigeBoostLevel:  this._prestigeBoostLevel,
        prestigeAnchorLevel: this._prestigeAnchorLevel,
        prestigeMirrorLevel: this._prestigeMirrorLevel,
        prestigeSpeedCost:   this.getPrestigeSpeedCost(),
        prestigeEnergyCost:  this.getPrestigeEnergyCost(),
        prestigeClockCost:   this.getPrestigeClockCost(),
        prestigeBoostCost:   this.getPrestigeBoostCost(),
        prestigeAnchorCost:  this.getPrestigeAnchorCost(),
        prestigeMirrorCost:  this.getPrestigeMirrorCost(),
        prestigeClockAtMax:  this._prestigeClockLevel >= CLOCK_MAX_EXTRA,
        prestigeBoostAtMax:  this._prestigeBoostLevel >= BOOST_MAX_LEVEL,
        prestigeMirrorAtMax: this._prestigeMirrorLevel >= CLOCK_MAX_EXTRA,
        prestigeTdLevel:     this._prestigeTdLevel,
        prestigeTdCost:      this.getPrestigeTdCost(),
        prestigeEntropyReduceLevel: this._prestigeEntropyReduceLevel,
        prestigeEntropyReduceCost:  this.getPrestigeEntropyReduceCost(),
        prestigeEntropyReduceAtMax: this._prestigeEntropyReduceLevel >= PRESTIGE_ENTROPY_REDUCE_MAX,
        prestigeEntropyTeLevel:  this._prestigeEntropyTeLevel,
        prestigeEntropyTeCost:   this.getPrestigeEntropyTeCost(),
        prestigeEntropyTeAtMax:  this._prestigeEntropyTeLevel >= PRESTIGE_ENTROPY_TE_MAX,
        prestigeEntropyTdLevel:  this._prestigeEntropyTdLevel,
        prestigeEntropyTdCost:   this.getPrestigeEntropyTdCost(),
        prestigeEntropyTdAtMax:  this._prestigeEntropyTdLevel >= PRESTIGE_ENTROPY_TD_MAX,
        prestigeAscendLevel:     this._prestigeAscendLevel,
        prestigeAscendCost:      this.getPrestigeAscendCost(),
        prestigeAscendAtMax:     this._prestigeAscendLevel >= PRESTIGE_ASCEND_MAX,
      });
    }
  }
}

// Singleton — one engine for the app lifetime
export const gameEngine = new GameEngine();
