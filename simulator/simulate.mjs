// simulate.mjs — ChronoForge headless progression simulator
// Usage: node simulate.mjs [max_hours=4] [strategy]
//
// No strategy arg → runs all strategies and saves one file each.
// Strategy arg    → runs that strategy only.
//
// Simulates full multi-prestige progression from scratch.
// Models: upgrades, entropy (including PP amplification), extra clock bonuses,
// TimeDust, Fast Time / Fracture / Reverse as expected values.
// Prestige fires as soon as 10 TD are available; PP is spent greedily (cheapest first).

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join }           from 'path';
import { fileURLToPath }  from 'url';

import {
  BASE_REVOLUTION_MS, ENERGY_PER_REVOLUTION,
  UPGRADE_BASE_COST, UPGRADE_COST_EXPONENT, UPGRADE_SPEED_BONUS, UPGRADE_SPEED_BONUS_SCALING,
  ENERGY_UPGRADE_BASE_COST, ENERGY_UPGRADE_COST_EXPONENT, ENERGY_UPGRADE_VALUE_BONUS, ENERGY_UPGRADE_VALUE_SCALING,
  CLOCK_UPGRADE_BASE_COST, CLOCK_UPGRADE_COST_EXPONENT, CLOCK_MAX_EXTRA,
  CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED,
  CLOCK2_SPEED_BONUS, CLOCK3_TE_BONUS, CLOCK4_ENTROPY_REDUCTION,
  BOOST_UPGRADE_BASE_COST, BOOST_UPGRADE_COST_EXPONENT, BOOST_MAX_LEVEL, BOOST_SPEED_FACTOR_MAX, CLOCK_SPEED_FACTOR,
  ENTROPY_BASE_STABILITY, ENTROPY_STABILITY_SCALING,
  STABILITY_UPGRADE_BASE_COST, STABILITY_UPGRADE_COST_EXPONENT,
  ENTROPY_TE_PENALTY_THRESHOLD, ENTROPY_TE_PENALTY_AT_THRESHOLD, ENTROPY_TE_PENALTY_AT_MAX,
  FRACTURE_ENTROPY_THRESHOLD, FRACTURE_LOSS_AT_THRESHOLD, FRACTURE_LOSS_AT_MAX,
  FAST_TIME_DURATION_MS, FAST_TIME_MULTIPLIER, FAST_TIME_DEBUFF_MULTIPLIER,
  ENTROPY_DEBUFF_THRESHOLD, ENTROPY_DEBUFF_CHANCE_MIN, ENTROPY_DEBUFF_CHANCE_MAX,
  PRESTIGE_COST_TD, PRESTIGE_ENTROPY_PP_SCALING,
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
  PRESTIGE_SINGULARITY_COST, PRESTIGE_SINGULARITY_SPEED_THRESHOLD,
  REVERSE_ENTROPY_THRESHOLD, REVERSE_CHANCE_AT_THRESHOLD, REVERSE_CHANCE_AT_MAX,
  REVERSE_DURATION_AT_THRESHOLD, REVERSE_DURATION_AT_MAX,
} from '../game/src/game/constants.js';

// ── Module-level pure math (no mutable state) ─────────────────────────────────

const speedMultAt    = (level) => { let b = 0; for (let i = 0; i < level; i++) b += UPGRADE_SPEED_BONUS * Math.pow(UPGRADE_SPEED_BONUS_SCALING, i); return 1 + b; };
const energyPerRevAt = (level, c3) => { let b = 0; for (let i = 0; i < level; i++) b += ENERGY_UPGRADE_VALUE_BONUS * Math.pow(ENERGY_UPGRADE_VALUE_SCALING, i); return ENERGY_PER_REVOLUTION + b + c3; };
const stabilityAt    = (level) => ENTROPY_BASE_STABILITY * Math.pow(ENTROPY_STABILITY_SCALING, level);
const boostFactorAt  = (level) => CLOCK_SPEED_FACTOR + Math.min(level, BOOST_MAX_LEVEL) * (BOOST_SPEED_FACTOR_MAX - CLOCK_SPEED_FACTOR) / BOOST_MAX_LEVEL;
const pCost          = (base, scale, level) => Math.ceil(base * Math.pow(scale, level));
const fmt            = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s/3600)).padStart(2,'0')}:${String(Math.floor((s%3600)/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; };

const STRATEGIES = {
  // tdBase: starting prestige TD threshold. tdCap: ceiling. Formula: min(tdBase + count*2, tdCap).
  greedy:   { label: 'Greedy (best ROI)',                speedW: 1, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD, tdBase: 10, tdCap: 20 },
  speed:    { label: 'Speed Focus (3× speed priority)', speedW: 3, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD, tdBase: 10, tdCap: 20 },
  energy:   { label: 'Energy Focus (3× energy priority)',speedW: 1, energyW: 3, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD, tdBase: 10, tdCap: 20 },
  safe:     { label: 'Entropy Safe (buy stability early)',speedW: 1, energyW: 1, stabilityW: 3, stabThresh: 0.1,                        tdBase: 10, tdCap: 20 },
  prestige: { label: 'Prestige Focus (max PP per run)',  speedW: 2, energyW: 2, stabilityW: 0.3, stabThresh: 0.65,                      tdBase: 25, tdCap: 50 },
  random:   { label: 'Random (chaotic player)',          speedW: 1, energyW: 1, stabilityW: 1, stabThresh: 0,                          tdBase: 10, tdCap: 20 },
};

const PRESTIGE_UPGRADES = [
  { key: 'speedLevel',          base: PRESTIGE_SPEED_BASE_COST,          scale: PRESTIGE_SPEED_SCALING,          max: Infinity },
  { key: 'energyLevel',         base: PRESTIGE_ENERGY_BASE_COST,         scale: PRESTIGE_ENERGY_SCALING,         max: Infinity },
  { key: 'anchorLevel',         base: PRESTIGE_ANCHOR_BASE_COST,         scale: PRESTIGE_ANCHOR_SCALING,         max: Infinity },
  { key: 'entropyReduceLevel',  base: PRESTIGE_ENTROPY_REDUCE_BASE_COST, scale: PRESTIGE_ENTROPY_REDUCE_SCALING, max: PRESTIGE_ENTROPY_REDUCE_MAX },
  { key: 'tdLevel',             base: PRESTIGE_TD_BASE_COST,             scale: PRESTIGE_TD_SCALING,             max: Infinity },
  { key: 'boostLevel',          base: PRESTIGE_BOOST_BASE_COST,          scale: PRESTIGE_BOOST_SCALING,          max: BOOST_MAX_LEVEL },
  { key: 'clockLevel',          base: PRESTIGE_CLOCK_BASE_COST,          scale: PRESTIGE_CLOCK_SCALING,          max: CLOCK_MAX_EXTRA },
  { key: 'ascendLevel',         base: PRESTIGE_ASCEND_BASE_COST,         scale: PRESTIGE_ASCEND_COST_SCALING,    max: PRESTIGE_ASCEND_MAX },
  { key: 'entropyTeLevel',      base: PRESTIGE_ENTROPY_TE_BASE_COST,     scale: PRESTIGE_ENTROPY_TE_SCALING,     max: PRESTIGE_ENTROPY_TE_MAX },
  { key: 'entropyTdLevel',      base: PRESTIGE_ENTROPY_TD_BASE_COST,     scale: PRESTIGE_ENTROPY_TD_SCALING,     max: PRESTIGE_ENTROPY_TD_MAX },
  { key: 'mirrorLevel',         base: PRESTIGE_MIRROR_BASE_COST,         scale: PRESTIGE_MIRROR_SCALING,         max: 1 },
  { key: 'singularityLevel',    base: PRESTIGE_SINGULARITY_COST,         scale: 1,                               max: 1 },
];

const TD_INTERVAL = 720 / 11;

// Per-strategy weights for PP spending. Score = weight / cost; highest score wins.
// Weights are deliberately extreme so strategies invest very differently.
const PRESTIGE_WEIGHTS = {
  greedy:   { speedLevel:4,  energyLevel:4,  mirrorLevel:15, clockLevel:3,  boostLevel:2,  anchorLevel:4,
              tdLevel:2,  entropyReduceLevel:3,  entropyTeLevel:2,  entropyTdLevel:2,  ascendLevel:2,  singularityLevel:1 },
  // Prestige Focus: everything that increases PP per prestige — Extra TD, Chaos Harvest, Ascendance
  prestige: { speedLevel:2,  energyLevel:2,  mirrorLevel:8,  clockLevel:2,  boostLevel:1,  anchorLevel:1,
              tdLevel:20, entropyReduceLevel:2,  entropyTeLevel:6,  entropyTdLevel:18, ascendLevel:18, singularityLevel:3 },
  // Speed: dump PP into speed multiplier and clock-2 boost; ignore energy/TD
  speed:  { speedLevel:30, energyLevel:1,  mirrorLevel:8,  clockLevel:10, boostLevel:20, anchorLevel:3,
            tdLevel:1,  entropyReduceLevel:1,  entropyTeLevel:1, entropyTdLevel:1, ascendLevel:1, singularityLevel:2 },
  // Energy: dump PP into TE/rev, Mirror Hands (2× TE), TD yield, and tier-3 TE bonuses
  energy: { speedLevel:1,  energyLevel:30, mirrorLevel:20, clockLevel:8,  boostLevel:1,  anchorLevel:2,
            tdLevel:15, entropyReduceLevel:2,  entropyTeLevel:12, entropyTdLevel:12, ascendLevel:10, singularityLevel:2 },
  // Safe: max out Entropy Shield and Anchor before anything else
  safe:   { speedLevel:2,  energyLevel:2,  mirrorLevel:6,  clockLevel:1,  boostLevel:1,  anchorLevel:25,
            tdLevel:3,  entropyReduceLevel:50, entropyTeLevel:2, entropyTdLevel:2, ascendLevel:2, singularityLevel:1 },
};

// ── Simulation ────────────────────────────────────────────────────────────────

function simulate(strategyKey, maxHours) {
  const STRAT    = STRATEGIES[strategyKey];
  const MAX_MS   = maxHours * 3_600_000;
  const isRandom = strategyKey === 'random';
  // Prestige threshold: strategy can override the default minimum.
  // Random varies it each run; prestige strategy uses a fixed higher target.
  let prestigeThreshold = STRAT.prestigeTD ?? PRESTIGE_COST_TD;

  // Prestige persistent state
  const P = { points: 0, lifetimePPSpent: 0, count: 0,
    speedLevel: 0, energyLevel: 0, clockLevel: 0, boostLevel: 0, anchorLevel: 0,
    mirrorLevel: 0, tdLevel: 0, entropyReduceLevel: 0,
    entropyTeLevel: 0, entropyTdLevel: 0, ascendLevel: 0, singularityLevel: 0 };

  // Run state (reset on prestige)
  const S = { ms: 0, energy: 0, speedLevel: 0, energyLevel: 0,
    clockCount: 1, boostLevel: 0, stabilityLevel: 0,
    clock2B: 0, clock3TeB: 0, clock4Red: 0,
    timeDust: 0, totalRevs: 0, extraRevs: [] };

  // P-dependent math (closures)
  const entropyReduceFactor = () => 1 - P.entropyReduceLevel / PRESTIGE_ENTROPY_REDUCE_MAX;

  const entropyOf = (speedLevel, clock2B, stabilityLevel, clock4Red) => {
    if (P.singularityLevel > 0 && speedMultAt(speedLevel) + clock2B >= PRESTIGE_SINGULARITY_SPEED_THRESHOLD) return 1;
    const excess = speedMultAt(speedLevel) + clock2B - 1;
    if (excess <= 0) return 0;
    const raw = Math.max(0, Math.min(1, excess / (excess + stabilityAt(stabilityLevel)) - clock4Red));
    return 1 - Math.pow(1 - raw, 1 + P.lifetimePPSpent * PRESTIGE_ENTROPY_PP_SCALING);
  };

  const tePenaltyOf = (ent) => {
    if (ent < ENTROPY_TE_PENALTY_THRESHOLD) return 0;
    const t = (ent - ENTROPY_TE_PENALTY_THRESHOLD) / (1 - ENTROPY_TE_PENALTY_THRESHOLD);
    return ENTROPY_TE_PENALTY_AT_THRESHOLD + t * (ENTROPY_TE_PENALTY_AT_MAX - ENTROPY_TE_PENALTY_AT_THRESHOLD);
  };

  const epsOf = (s) => {
    const sm  = speedMultAt(s.speedLevel) + s.clock2B;
    const ent = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);
    const rps = sm / (BASE_REVOLUTION_MS / 1000);
    const penalty    = tePenaltyOf(ent) * entropyReduceFactor();
    const resonance  = ent >= PRESTIGE_ENTROPY_BONUS_THRESHOLD ? P.entropyTeLevel * PRESTIGE_ENTROPY_TE_BONUS : 0;
    const mirrorMult = P.mirrorLevel >= 1 ? 2 : 1;
    return rps * energyPerRevAt(s.energyLevel, s.clock3TeB) * Math.max(0, 1 - penalty + resonance) * mirrorMult;
  };

  const debuffChanceOf = (ent) => ent < ENTROPY_DEBUFF_THRESHOLD ? 0
    : ENTROPY_DEBUFF_CHANCE_MIN + (ent - ENTROPY_DEBUFF_THRESHOLD) / (1 - ENTROPY_DEBUFF_THRESHOLD) * (ENTROPY_DEBUFF_CHANCE_MAX - ENTROPY_DEBUFF_CHANCE_MIN);

  const effectiveEPS = (s) => {
    const base = epsOf(s);
    const sm   = speedMultAt(s.speedLevel) + s.clock2B;
    const ent  = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);
    const ftFrac = Math.min(1, FAST_TIME_DURATION_MS / (BASE_REVOLUTION_MS / sm * (60 / 59)));
    const dc     = debuffChanceOf(ent) * entropyReduceFactor();
    const ftDelta = ftFrac * ((1 - dc) * (FAST_TIME_MULTIPLIER - 1) + dc * (FAST_TIME_DEBUFF_MULTIPLIER - 1));
    let reverseDrain = 0;
    if (ent >= REVERSE_ENTROPY_THRESHOLD) {
      const t     = (ent - REVERSE_ENTROPY_THRESHOLD) / (1 - REVERSE_ENTROPY_THRESHOLD);
      const chance = (REVERSE_CHANCE_AT_THRESHOLD + t * (REVERSE_CHANCE_AT_MAX - REVERSE_CHANCE_AT_THRESHOLD)) * entropyReduceFactor();
      const durMs  = REVERSE_DURATION_AT_THRESHOLD + t * (REVERSE_DURATION_AT_MAX - REVERSE_DURATION_AT_THRESHOLD);
      reverseDrain = chance * (durMs / (BASE_REVOLUTION_MS / sm)) * base;
    }
    return Math.max(0, base * (1 + ftDelta) - reverseDrain);
  };

  const costs = {
    speed:     (s) => Math.floor(UPGRADE_BASE_COST          * Math.pow(UPGRADE_COST_EXPONENT,          s.speedLevel)),
    energy:    (s) => Math.floor(ENERGY_UPGRADE_BASE_COST   * Math.pow(ENERGY_UPGRADE_COST_EXPONENT,   s.energyLevel)),
    clock:     (s) => Math.floor(CLOCK_UPGRADE_BASE_COST    * Math.pow(CLOCK_UPGRADE_COST_EXPONENT,    s.clockCount - 1)),
    boost:     (s) => Math.floor(BOOST_UPGRADE_BASE_COST    * Math.pow(BOOST_UPGRADE_COST_EXPONENT,    s.boostLevel)),
    stability: (s) => Math.floor(STABILITY_UPGRADE_BASE_COST * Math.pow(STABILITY_UPGRADE_COST_EXPONENT, s.stabilityLevel)),
  };

  // Tracking
  const milestones = [], snapshots = [], seen = new Set();
  let totalTeSpent = 0;
  const mark = (label)      => milestones.push({ ms: S.ms, label });
  const once = (key, label) => { if (!seen.has(key)) { seen.add(key); mark(label); } };

  // Prestige helpers
  function buyPrestigeUpgrades() {
    let bought = true;
    while (bought) {
      bought = false;
      const affordable = PRESTIGE_UPGRADES.filter(u =>
        P[u.key] < u.max && pCost(u.base, u.scale, P[u.key]) <= P.points
      );
      if (affordable.length === 0) break;

      let pick;
      if (isRandom) {
        // Random: pick any affordable upgrade uniformly at random
        pick = affordable[Math.floor(Math.random() * affordable.length)];
      } else {
        // Weighted: highest score wins
        const weights = PRESTIGE_WEIGHTS[strategyKey];
        pick = affordable.reduce((best, upg) => {
          const score = (weights[upg.key] ?? 1) / pCost(upg.base, upg.scale, P[upg.key]);
          const bestScore = (weights[best.key] ?? 1) / pCost(best.base, best.scale, P[best.key]);
          return score > bestScore ? upg : best;
        });
      }

      const cost = pCost(pick.base, pick.scale, P[pick.key]);
      P.points -= cost; P.lifetimePPSpent += cost; P[pick.key]++; bought = true;
    }
  }

  function doPrestige(triggeredAt) {
    if (isRandom) prestigeThreshold = PRESTIGE_COST_TD + Math.floor(Math.random() * 8);
    const ent     = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
    const ppCoeff = 1 + P.ascendLevel * PRESTIGE_ASCEND_BOOST;
    const ppGain  = Math.floor(S.timeDust * (1 + ent * ppCoeff));
    P.points += ppGain;
    P.count++;
    const ppBefore = P.points;
    buyPrestigeUpgrades();
    mark(`★ PRESTIGE #${P.count} — +${ppGain} PP (${P.points} left, ${ppBefore - P.points} spent) | TD ${S.timeDust.toFixed(1)}/${triggeredAt} | ent ${(ent*100).toFixed(0)}% | Shield Lv${P.entropyReduceLevel} | SpeedBoost Lv${P.speedLevel}`);
    S.energy = 0; S.speedLevel = P.speedLevel; S.energyLevel = P.energyLevel;
    S.clockCount = 1 + P.clockLevel; S.boostLevel = P.boostLevel; S.stabilityLevel = P.anchorLevel;
    S.clock2B = 0; S.clock3TeB = 0; S.clock4Red = 0;
    S.timeDust = 0; S.totalRevs = 0; S.extraRevs = Array(P.clockLevel).fill(0);
    seen.delete('ent40'); seen.delete('ent60'); seen.delete('ent80');
  }

  // Player upgrade strategy
  function pickUpgrade() {
    const { speedW, energyW, stabilityW, stabThresh } = STRAT;
    const curEPS = effectiveEPS(S);
    const ent    = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
    const sm     = speedMultAt(S.speedLevel) + S.clock2B;
    const pool   = []; // for random strategy
    let best = null;
    const consider = (type, cost, dEPS) => {
      if (S.energy < cost) return;
      if (isRandom) { pool.push({ type, cost, eff: dEPS / cost }); return; }
      const eff = dEPS / cost;
      if (!best || eff > best.eff) best = { type, cost, eff };
    };
    consider('speed',  costs.speed(S),  (effectiveEPS({ ...S, speedLevel:  S.speedLevel  + 1 }) - curEPS) * speedW);
    consider('energy', costs.energy(S), (effectiveEPS({ ...S, energyLevel: S.energyLevel + 1 }) - curEPS) * energyW);
    if (ent > stabThresh && S.stabilityLevel < 20) {
      const dEPS  = effectiveEPS({ ...S, stabilityLevel: S.stabilityLevel + 1 }) - curEPS;
      const urgency = ent > REVERSE_ENTROPY_THRESHOLD ? 3 : ent > 0.5 ? 2 : 1;
      consider('stability', costs.stability(S), dEPS * urgency * stabilityW);
    }
    if (S.clockCount - 1 < CLOCK_MAX_EXTRA) {
      const idx        = S.clockCount - 1;
      const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
      const bRatio     = boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR;
      const clockRPS   = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[idx] * bRatio;
      let pdEPS;
      if      (idx === 0) pdEPS = clockRPS * CLOCK2_SPEED_BONUS * (curEPS / sm) * 60;
      else if (idx === 1) pdEPS = clockRPS * CLOCK3_TE_BONUS * (sm / (BASE_REVOLUTION_MS / 1000)) * 60;
      else                pdEPS = clockRPS * CLOCK4_ENTROPY_REDUCTION * curEPS * 60;
      consider('clock', costs.clock(S), pdEPS);
    }
    if (S.boostLevel < BOOST_MAX_LEVEL && S.clockCount > 1) {
      const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
      let pdEPS = 0;
      for (let i = 0; i < S.extraRevs.length; i++) {
        const dRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[i] * ((boostFactorAt(S.boostLevel + 1) - boostFactorAt(S.boostLevel)) / CLOCK_SPEED_FACTOR);
        if (i === 0) pdEPS += dRPS * CLOCK2_SPEED_BONUS * (curEPS / sm) * 60;
        else if (i === 1) pdEPS += dRPS * CLOCK3_TE_BONUS * (sm / (BASE_REVOLUTION_MS / 1000)) * 60;
      }
      consider('boost', costs.boost(S), pdEPS);
    }
    if (isRandom) return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    return best;
  }

  function applyUpgrade(u) {
    S.energy -= u.cost; totalTeSpent += u.cost;
    let lvl;
    switch (u.type) {
      case 'speed':     S.speedLevel++;     lvl = S.speedLevel;     break;
      case 'energy':    S.energyLevel++;    lvl = S.energyLevel;    break;
      case 'clock':     S.clockCount++; S.extraRevs.push(0); lvl = S.clockCount - 1; break;
      case 'boost':     S.boostLevel++;     lvl = S.boostLevel;     break;
      case 'stability': S.stabilityLevel++; lvl = S.stabilityLevel; break;
    }
    const sm  = (speedMultAt(S.speedLevel) + S.clock2B).toFixed(2);
    const eps = effectiveEPS(S).toFixed(3);
    const ent = (entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red) * 100).toFixed(0);
    mark(`${u.type.padEnd(9)} Lv${String(lvl).padStart(2)} | cost ${String(u.cost).padStart(6)} TE | ${sm}× | ${eps} TE/s | ent ${ent}%`);
  }

  // Main loop
  mark(`Start  —  1× | ${effectiveEPS(S).toFixed(3)} TE/s`);
  const SNAP_INTERVAL = 5 * 60_000;
  let lastSnapMs = -SNAP_INTERVAL;

  while (S.ms < MAX_MS) {
    // Prestige threshold: ramps by +2 TD per completed prestige, capped at tdCap.
    // Random overrides this with a per-run random value set in doPrestige().
    const _threshold = isRandom
      ? prestigeThreshold
      : Math.min(STRAT.tdBase + P.count * 2, STRAT.tdCap);
    if (S.timeDust >= _threshold) { doPrestige(_threshold); continue; }
    let upg; while ((upg = pickUpgrade())) applyUpgrade(upg);

    const ent = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
    if (ent >= 0.40) once('ent40', `⚠  Entropy ≥ 40% — debuffs + fracture active`);
    if (ent >= 0.60) once('ent60', `⚠  Entropy ≥ 60% — Reverse Time active`);
    if (ent >= 0.80) once('ent80', `⚠  Entropy ≥ 80%`);

    if (S.ms - lastSnapMs >= SNAP_INTERVAL) {
      lastSnapMs = S.ms;
      snapshots.push({ ms: S.ms, pct: P.count, spd: S.speedLevel,
        sm: (speedMultAt(S.speedLevel) + S.clock2B).toFixed(2),
        eps: effectiveEPS(S).toFixed(3), nrg: Math.floor(S.energy),
        ent: (ent * 100).toFixed(0) + '%', td: S.timeDust.toFixed(1),
        clk: S.clockCount, pp: P.points });
    }

    const eps = effectiveEPS(S);
    const allCosts = [costs.speed(S), costs.energy(S),
      S.clockCount - 1 < CLOCK_MAX_EXTRA ? costs.clock(S) : Infinity,
      S.boostLevel < BOOST_MAX_LEVEL && S.clockCount > 1 ? costs.boost(S) : Infinity,
      ent > FRACTURE_ENTROPY_THRESHOLD ? costs.stability(S) : Infinity].filter(isFinite);
    const cheapest = Math.min(...allCosts);
    let stepMs = 1000;
    if (eps > 0 && cheapest > S.energy) {
      const waitMs = (cheapest - S.energy) / eps * 1000;
      if (waitMs > 2000) stepMs = Math.min(waitMs * 0.9, 30_000);
    }
    stepMs = Math.min(stepMs, MAX_MS - S.ms);
    if (stepMs <= 0) break;

    const sm        = speedMultAt(S.speedLevel) + S.clock2B;
    const prevRevs  = S.totalRevs;
    const deltaRevs = sm * stepMs / BASE_REVOLUTION_MS;
    S.energy += eps * stepMs / 1000; S.totalRevs += deltaRevs; S.ms += stepMs;

    const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
    const bRatio = boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR;
    for (let i = 0; i < S.extraRevs.length; i++) {
      const prev = S.extraRevs[i];
      S.extraRevs[i] += deltaRevs * EXTRA_BASE[i] * bRatio;
      const done = Math.floor(S.extraRevs[i]) - Math.floor(prev);
      if (done > 0) {
        if (i === 0) S.clock2B += done * CLOCK2_SPEED_BONUS;
        else if (i === 1) S.clock3TeB += done * CLOCK3_TE_BONUS;
        else if (i === 2) S.clock4Red = Math.min(1, S.clock4Red + done * CLOCK4_ENTROPY_REDUCTION);
      }
    }

    const tdBefore = Math.floor(prevRevs / TD_INTERVAL), tdAfter = Math.floor(S.totalRevs / TD_INTERVAL);
    if (tdAfter > tdBefore) {
      const n = tdAfter - tdBefore;
      const chaosBonus = ent >= PRESTIGE_ENTROPY_BONUS_THRESHOLD ? P.entropyTdLevel * PRESTIGE_ENTROPY_TD_BONUS : 0;
      S.timeDust += n * (1 + P.tdLevel * PRESTIGE_TD_BONUS) * (1 + chaosBonus);
      if (ent >= FRACTURE_ENTROPY_THRESHOLD) {
        const t = (ent - FRACTURE_ENTROPY_THRESHOLD) / (1 - FRACTURE_ENTROPY_THRESHOLD);
        const lr = (FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD)) * entropyReduceFactor();
        if (lr > 0) for (let i = 0; i < n; i++) S.energy = Math.max(0, S.energy * (1 - lr));
      }
    }
  }

  // Build output lines
  const W  = 80, HR = '─'.repeat(W), lines = [];
  const lg = (s = '') => lines.push(String(s));

  const fEnt = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
  const fSM  = speedMultAt(S.speedLevel) + S.clock2B;

  lg(`${'═'.repeat(W)}`);
  lg(` ChronoForge  —  ${strategyKey.toUpperCase()}  —  ${maxHours}h`);
  lg(`${'═'.repeat(W)}`);
  lg(` Strategy : ${STRAT.label}`);
  lg(` Events   : Fast Time / Fracture / Reverse modeled as expected value`);
  lg('');

  const upg = (label, val, max) => {
    const bar = (max && max < Infinity)
      ? ` [${'█'.repeat(val)}${'░'.repeat(max - val)}]`
      : '';
    return ` ${label.padEnd(28)}: Lv${String(val).padStart(2)}${bar}`;
  };

  lg(`FINAL STATE  at ${fmt(S.ms)}\n${HR}`);
  lg(` Prestiges : ${P.count}  |  PP available: ${P.points}  |  Lifetime PP spent: ${P.lifetimePPSpent}`);
  lg('');
  lg(` Prestige upgrades:`);
  lg(`   Tier 1 — Run Boosters`);
  lg(upg('  Boost Accelerate Time', P.speedLevel));
  lg(upg('  Boost Improve Time',    P.energyLevel));
  lg(upg('  Boost Add Clock',       P.clockLevel,  CLOCK_MAX_EXTRA));
  lg(upg('  Boost Clocks',          P.boostLevel,  BOOST_MAX_LEVEL));
  lg(upg('  Boost Anchor Time',     P.anchorLevel));
  lg(`   Tier 2 — New Mechanics`);
  lg(upg('  Mirror Hands',          P.mirrorLevel, 1));
  lg(upg('  Extra TD',              P.tdLevel));
  lg(upg('  Entropy Shield',        P.entropyReduceLevel, PRESTIGE_ENTROPY_REDUCE_MAX));
  lg(`   Tier 3 — Entropy as Resource`);
  lg(upg('  Temporal Resonance',    P.entropyTeLevel,  PRESTIGE_ENTROPY_TE_MAX));
  lg(upg('  Chaos Harvest',         P.entropyTdLevel,  PRESTIGE_ENTROPY_TD_MAX));
  lg(upg('  Entropy Ascendance',    P.ascendLevel,     PRESTIGE_ASCEND_MAX));
  lg(`   Tier 4`);
  lg(upg('  Temporal Singularity',  P.singularityLevel, 1));
  lg('');
  lg(` Run state:`);
  lg(`  Speed    : Lv${S.speedLevel} base ${speedMultAt(S.speedLevel).toFixed(2)}× + clock2 ${S.clock2B.toFixed(2)}× = ${fSM.toFixed(2)}× total`);
  lg(`  TE/s     : ${effectiveEPS(S).toFixed(4)}`);
  lg(`  Entropy  : ${(fEnt*100).toFixed(1)}%`);
  lg(`  TimeDust : ${S.timeDust.toFixed(1)} TD`);
  lg('');

  lg(`MILESTONES\n${HR}`);
  for (const { ms, label } of milestones) lg(` ${fmt(ms).padEnd(10)}  ${label}`);

  lg(`\nSNAPSHOTS (every 5 min)\n${HR}`);
  lg(` ${'Time'.padEnd(10)} ${'P#'.padEnd(4)} ${'SpdLv'.padEnd(6)} ${'×'.padEnd(8)} ${'TE/s'.padEnd(10)} ${'Energy'.padEnd(10)} ${'Ent%'.padEnd(7)} ${'TD'.padEnd(7)} PP`);
  lg(HR);
  for (const s of snapshots)
    lg(` ${fmt(s.ms).padEnd(10)} ${String(s.pct).padEnd(4)} ${String(s.spd).padEnd(6)} ${s.sm.padEnd(8)} ${s.eps.padEnd(10)} ${String(s.nrg).padEnd(10)} ${s.ent.padEnd(7)} ${s.td.padEnd(7)} ${s.pp}`);
  lg('');

  return {
    lines,
    stats: {
      prestiges:     P.count,
      lifetimePP:    P.lifetimePPSpent,
      speedBoost:    P.speedLevel,
      energyBoost:   P.energyLevel,
      anchorBoost:   P.anchorLevel,
      clockBoost:    P.clockLevel,
      boostBoost:    P.boostLevel,
      mirrorLevel:   P.mirrorLevel,
      tdBoost:       P.tdLevel,
      shield:        P.entropyReduceLevel,
      resonance:     P.entropyTeLevel,
      harvest:       P.entropyTdLevel,
      ascend:        P.ascendLevel,
      finalTEps:     effectiveEPS(S),
      finalSpeed:    (speedMultAt(S.speedLevel) + S.clock2B),
      finalEntropy:  entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red),
      finalTD:       S.timeDust,
    },
  };
}

// ── Main entry ────────────────────────────────────────────────────────────────

const MAX_HOURS  = parseFloat(process.argv[2] ?? '4');
const stratArg   = process.argv[3];
const runKeys    = (stratArg && STRATEGIES[stratArg]) ? [stratArg] : Object.keys(STRATEGIES);

if (stratArg && !STRATEGIES[stratArg]) {
  console.error(`Unknown strategy "${stratArg}". Valid: ${Object.keys(STRATEGIES).join(', ')}, or omit to run all.`);
  process.exit(1);
}

const __dir  = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dir, 'runOutputs');
mkdirSync(outDir, { recursive: true });

const results = {};
for (const key of runKeys) {
  console.log(`Running ${key} (${MAX_HOURS}h)...`);
  const { lines, stats } = simulate(key, MAX_HOURS);
  results[key] = stats;
  const outPath = join(outDir, `${key}_${MAX_HOURS}h.txt`);
  writeFileSync(outPath, lines.join('\n'));
  console.log(lines.join('\n'));
  console.log(`Saved → ${outPath}\n`);
}

// ── Comparison table (only when running all strategies) ───────────────────────
if (runKeys.length > 1) {
  const W  = 80, HR = '─'.repeat(W);
  const kw = 22;
  const cw = Math.floor((W - kw) / runKeys.length);
  const pad = (s, w) => String(s).padEnd(w);
  const hdr = (s)    => String(s).slice(0,cw).padEnd(cw);

  const rows = [
    ['Prestiges',        k => results[k].prestiges],
    ['Lifetime PP spent',k => results[k].lifetimePP],
    ['── Prestige upgrades ──', null],
    ['  Speed boost Lv', k => results[k].speedBoost],
    ['  Energy boost Lv',k => results[k].energyBoost],
    ['  Anchor boost Lv',k => results[k].anchorBoost],
    ['  Clock boost Lv', k => results[k].clockBoost],
    ['  Boost boost Lv', k => results[k].boostBoost],
    ['  Mirror Hands Lv', k => results[k].mirrorLevel],
    ['  Extra TD Lv',    k => results[k].tdBoost],
    ['  Entropy Shield', k => results[k].shield],
    ['  Resonance Lv',   k => results[k].resonance],
    ['  Harvest Lv',     k => results[k].harvest],
    ['  Ascend Lv',      k => results[k].ascend],
    ['── End of run ─────────', null],
    ['  TE/s',           k => results[k].finalTEps.toFixed(3)],
    ['  Speed ×',        k => results[k].finalSpeed.toFixed(2)],
    ['  Entropy %',      k => (results[k].finalEntropy * 100).toFixed(1) + '%'],
    ['  TimeDust',       k => results[k].finalTD.toFixed(1)],
  ];

  console.log(`\n${'═'.repeat(W)}`);
  console.log(` STRATEGY COMPARISON  —  ${MAX_HOURS}h`);
  console.log(`${'═'.repeat(W)}`);
  console.log(pad('', kw) + runKeys.map(k => hdr(k.toUpperCase())).join(''));
  console.log(HR);
  for (const [label, fn] of rows) {
    if (!fn) { console.log(label); continue; }
    console.log(pad(label, kw) + runKeys.map(k => hdr(fn(k))).join(''));
  }
  console.log('');
}
