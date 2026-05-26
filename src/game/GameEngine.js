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
  BOOST_UPGRADE_BASE_COST,
  BOOST_UPGRADE_COST_EXPONENT,
  BOOST_SPEED_BONUS,
  BOOST_SPEED_BONUS_SCALING,
  FAST_TIME_DURATION_MS,
  FAST_TIME_MULTIPLIER,
  FAST_TIME_DEBUFF_MULTIPLIER,
  FAST_TIME_THRESHOLD_DEG,
  ENTROPY_DEBUFF_THRESHOLD,
  ENTROPY_DEBUFF_CHANCE_MIN,
  ENTROPY_DEBUFF_CHANCE_MAX,
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
  CLOCK_YIELD_MULTIPLIER,
  ENTROPY_BASE_STABILITY,
  ENTROPY_STABILITY_SCALING,
  STABILITY_UPGRADE_BASE_COST,
  STABILITY_UPGRADE_COST_EXPONENT,
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
    this._prevSurgeNear = [true]; // start true so the initial 12-o'clock doesn't trigger
    // Start all clocks as "already near" so the initial 12-o'clock position
    // doesn't immediately fire the event on the first frame.
    this._prevNear = [true];         // second vs minute; index 0 = main, i+1 = extra i
    this._prevHourMinNear = [true];  // minute vs hour;   same indexing

    // TimeDust — saved
    this._timeDust = 0;

    // Prestige — saved, never reset by prestige itself
    this._prestigePoints = 0;

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

  /** Simulate one second of game time passing instantly */
  addSecond() {
    this._update(1000);
  }

  /** Debug: inject energy directly */
  addEnergy(amount) {
    this._energy += amount;
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
    this._prevNear = [true];
    this._prevHourMinNear = [true];
    this._prevSurgeNear = [true];
    this._timeDust = 0;
    this._prestigePoints = 0;
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch { /* ignore */ }
    this._emitSnapshot();
  }

  /** Prestige — converts TD to PP and resets all non-prestige progress */
  prestige() {
    if (this._timeDust < PRESTIGE_COST_TD) return false;
    this._prestigePoints += Math.floor(this._timeDust);
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
    this._prevNear = [true];
    this._prevHourMinNear = [true];
    this._prevSurgeNear = [true];
    this._timeDust = 0;
    this.save();
    this._emitSnapshot();
    return true;
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
      UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_EXPONENT, this._speedLevel)
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

  /** Purchase one additional clock — returns false if not enough energy */
  buyClockUpgrade() {
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
    const extraClocks = this._clockCount - 1; // already-purchased extras
    return Math.floor(
      CLOCK_UPGRADE_BASE_COST * Math.pow(CLOCK_UPGRADE_COST_EXPONENT, extraClocks)
    );
  }

  /** Purchase one level of Boost Clocks — returns false if not enough energy */
  buyBoostUpgrade() {
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
      BOOST_UPGRADE_BASE_COST * Math.pow(BOOST_UPGRADE_COST_EXPONENT, this._boostLevel)
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
    let bonus = 0;
    for (let i = 0; i < level; i++) {
      bonus += BOOST_SPEED_BONUS * Math.pow(BOOST_SPEED_BONUS_SCALING, i);
    }
    return CLOCK_SPEED_FACTOR + bonus;
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
      STABILITY_UPGRADE_BASE_COST * Math.pow(STABILITY_UPGRADE_COST_EXPONENT, this._stabilityLevel)
    );
  }

  /** Stability denominator at a given upgrade level */
  _stabilityAt(level) {
    return ENTROPY_BASE_STABILITY * Math.pow(ENTROPY_STABILITY_SCALING, level);
  }

  /** Entropy for a given stability level (uses current speed) */
  _entropyAt(stabilityLevel) {
    const excess = this.getSpeedMultiplier() - 1;
    if (excess <= 0) return 0;
    const stability = this._stabilityAt(stabilityLevel);
    return excess / (excess + stability);
  }

  /** Current Time Entropy — 0 (stable) to 1 (total chaos) */
  getEntropy() {
    return this._entropyAt(this._stabilityLevel);
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
      ENERGY_UPGRADE_BASE_COST * Math.pow(ENERGY_UPGRADE_COST_EXPONENT, this._energyLevel)
    );
  }

  /** TE earned per full revolution — bonus per level scales by ENERGY_UPGRADE_VALUE_SCALING */
  getEnergyPerRevolution() {
    return this._energyPerRevAt(this._energyLevel);
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
    const mainRPS = (1000 / BASE_REVOLUTION_MS) * this.getSpeedMultiplier() * fastMult * surgeMult;
    const energyPerRev = this.getEnergyPerRevolution();
    let total = mainRPS * energyPerRev * surgeEnergyMult;

    const baseFactor = this.getExtraClockSpeedFactor();
    for (let i = 0; i < this._clockCount - 1; i++) {
      const factor = baseFactor * Math.pow(CLOCK_SPEED_FACTOR, i);
      const yieldMult = Math.pow(CLOCK_YIELD_MULTIPLIER, i + 1);
      total += mainRPS * factor * energyPerRev * yieldMult * surgeEnergyMult;
    }

    return total;
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
      timeDust: this._timeDust,
      prestigePoints: this._prestigePoints,
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
      this._timeDust = data.timeDust ?? 0;
      this._prestigePoints = data.prestigePoints ?? 0;
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

  _update(deltaMs) {
    // Decrement fast time before this frame's physics so the multiplier reflects
    // the state at the start of the frame.
    this._fastTimeRemaining = Math.max(0, this._fastTimeRemaining - deltaMs);
    this._fractureFlash = Math.max(0, this._fractureFlash - deltaMs);
    this._surgeRemaining = Math.max(0, this._surgeRemaining - deltaMs);
    const isFastTime = this._fastTimeRemaining > 0;
    const isSurge = this._surgeRemaining > 0;
    const fastTimeMult = isFastTime
      ? (this._fastTimeIsDebuff ? FAST_TIME_DEBUFF_MULTIPLIER : FAST_TIME_MULTIPLIER)
      : 1;

    const speedMult = this.getSpeedMultiplier() * fastTimeMult * (isSurge ? SURGE_SPEED_MULTIPLIER : 1);
    const surgeEnergyMult = isSurge ? SURGE_ENERGY_MULTIPLIER : 1;
    // How many degrees does the second hand travel in deltaMs?
    const degreesPerMs = 360 / (BASE_REVOLUTION_MS / speedMult);
    const deltaDegrees = degreesPerMs * deltaMs;

    const prevAngle = this._angle;
    this._angle = (this._angle + deltaDegrees) % 360;

    // Detect full revolutions — handle wrap-around correctly.
    // A revolution completes whenever the angle crosses 0 from 359→0.
    const crossings = Math.floor((prevAngle + deltaDegrees) / 360);
    if (crossings > 0) {
      this._energy += crossings * this.getEnergyPerRevolution() * surgeEnergyMult;
      this._totalRevolutions += crossings;
    }

    // Extra clocks: speed = getExtraClockSpeedFactor() * CLOCK_SPEED_FACTOR^i
    // e.g. at boost 0: 0.1, 0.01, 0.001 — at boost 1: 0.2, 0.02, 0.002
    const baseFactor = this.getExtraClockSpeedFactor();
    for (let i = 0; i < this._extraAngles.length; i++) {
      const factor = baseFactor * Math.pow(CLOCK_SPEED_FACTOR, i);
      const extraDelta = deltaDegrees * factor;
      const prevExtra = this._extraAngles[i];
      this._extraAngles[i] = (prevExtra + extraDelta) % 360;
      const extraCrossings = Math.floor((prevExtra + extraDelta) / 360);
      const yieldMult = Math.pow(CLOCK_YIELD_MULTIPLIER, i + 1);
      if (extraCrossings > 0) {
        this._energy += extraCrossings * this.getEnergyPerRevolution() * yieldMult * surgeEnergyMult;
        this._totalRevolutions += extraCrossings;
        this._extraRevolutions[i] += extraCrossings;
      }
    }

    // Fast Time: second vs minute hand overlap — resets timer on rising edge.
    this._checkOverlap(0, this._angle, this._totalRevolutions);
    for (let i = 0; i < this._extraAngles.length; i++) {
      this._checkOverlap(i + 1, this._extraAngles[i], this._extraRevolutions[i]);
    }

    // TimeDust: minute vs hour hand overlap — awards TD on rising edge.
    this._checkHourMinuteOverlap(0, this._angle, this._totalRevolutions, TIMEDUST_BASE_YIELD);
    for (let i = 0; i < this._extraAngles.length; i++) {
      const yieldMult = TIMEDUST_BASE_YIELD * Math.pow(CLOCK_YIELD_MULTIPLIER, i + 1);
      this._checkHourMinuteOverlap(i + 1, this._extraAngles[i], this._extraRevolutions[i], yieldMult);
    }

    // Temporal Surge: all three hands at 12 — triggers on rising edge.
    this._checkAllHandsAtTwelve(0, this._angle, this._totalRevolutions);
    for (let i = 0; i < this._extraAngles.length; i++) {
      this._checkAllHandsAtTwelve(i + 1, this._extraAngles[i], this._extraRevolutions[i]);
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
      this._timeDust += yieldMult;

      const entropy = this.getEntropy();
      if (entropy >= FRACTURE_ENTROPY_THRESHOLD) {
        const t = (entropy - FRACTURE_ENTROPY_THRESHOLD) / (1 - FRACTURE_ENTROPY_THRESHOLD);
        const lossRate = FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD);
        this._energy = Math.max(0, this._energy * (1 - lossRate));
        this._fractureFlash = FRACTURE_FLASH_MS;
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
        ? ENTROPY_DEBUFF_CHANCE_MIN + (entropy - ENTROPY_DEBUFF_THRESHOLD) / (1 - ENTROPY_DEBUFF_THRESHOLD) * (ENTROPY_DEBUFF_CHANCE_MAX - ENTROPY_DEBUFF_CHANCE_MIN)
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
        speedMultiplier: this.getSpeedMultiplier(),
        nextSpeedMultiplier: this._speedMultiplierAt(this._speedLevel + 1),
        energyPerSecond: this.getEnergyPerSecond(true),
        upgradeCost: this.getUpgradeCost(),
        energyLevel: this._energyLevel,
        energyPerRevolution: this.getEnergyPerRevolution(),
        nextEnergyPerRevolution: this._energyPerRevAt(this._energyLevel + 1),
        energyUpgradeCost: this.getEnergyUpgradeCost(),
        clockCount: this._clockCount,
        boostLevel: this._boostLevel,
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
        totalRevolutions: this._totalRevolutions,
        timeDust: this._timeDust,
        prestigePoints: this._prestigePoints,
        canPrestige: this._timeDust >= PRESTIGE_COST_TD,
        entropy: this.getEntropy(),
        nextEntropy: this._entropyAt(this._stabilityLevel + 1),
        stabilityLevel: this._stabilityLevel,
        stabilityUpgradeCost: this.getStabilityUpgradeCost(),
      });
    }
  }
}

// Singleton — one engine for the app lifetime
export const gameEngine = new GameEngine();
