// simulate.mjs — ChronoForge headless progression simulator
// Usage: node simulate.mjs [max_hours=4] [strategy=greedy]
//
// Simulates full multi-prestige progression from scratch.
// Models: upgrades, entropy (including PP amplification), extra clock bonuses,
// TimeDust, Fast Time / Fracture / Reverse as expected values.
// Prestige fires as soon as 10 TD are available; PP is spent greedily (cheapest first).
// Temporal Surge excluded (rare; requires hand-angle tracking).

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
  PRESTIGE_COST_TD,
  PRESTIGE_ENTROPY_PP_SCALING,
  PRESTIGE_SPEED_BASE_COST, PRESTIGE_SPEED_SCALING,
  PRESTIGE_ENERGY_BASE_COST, PRESTIGE_ENERGY_SCALING,
  PRESTIGE_CLOCK_BASE_COST, PRESTIGE_CLOCK_SCALING,
  PRESTIGE_BOOST_BASE_COST, PRESTIGE_BOOST_SCALING,
  PRESTIGE_ANCHOR_BASE_COST, PRESTIGE_ANCHOR_SCALING,
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

// ── Prestige persistent state (survives run resets) ───────────────────────────
// Defined before math functions so entropyOf can reference lifetimePPSpent.
const P = {
  points: 0,   // available PP
  lifetimePPSpent: 0,   // total PP ever spent — permanently amplifies entropy
  count: 0,   // number of prestiges completed
  // Tier 1 — run boosters
  speedLevel: 0,
  energyLevel: 0,
  clockLevel: 0,
  boostLevel: 0,
  anchorLevel: 0,
  // Tier 2
  tdLevel: 0,   // Extra TD
  entropyReduceLevel: 0,   // Entropy Shield
  // Tier 3
  entropyTeLevel: 0,   // Temporal Resonance
  entropyTdLevel: 0,   // Chaos Harvest
  ascendLevel: 0,   // Entropy Ascendance
  // Tier 4
  singularityLevel: 0,   // Temporal Singularity
};

// ── Pure math (mirrors GameEngine) ───────────────────────────────────────────

const speedMultAt = (level) => {
  let b = 0;
  for (let i = 0; i < level; i++) b += UPGRADE_SPEED_BONUS * Math.pow(UPGRADE_SPEED_BONUS_SCALING, i);
  return 1 + b;
};

const energyPerRevAt = (level, clock3Bonus) => {
  let b = 0;
  for (let i = 0; i < level; i++) b += ENERGY_UPGRADE_VALUE_BONUS * Math.pow(ENERGY_UPGRADE_VALUE_SCALING, i);
  return ENERGY_PER_REVOLUTION + b + clock3Bonus;
};

const stabilityAt = (level) => ENTROPY_BASE_STABILITY * Math.pow(ENTROPY_STABILITY_SCALING, level);

const entropyOf = (speedLevel, clock2B, stabilityLevel, clock4Red) => {
  // Temporal Singularity: at threshold speed, entropy locks to 1.0
  if (P.singularityLevel > 0 && speedMultAt(speedLevel) + clock2B >= PRESTIGE_SINGULARITY_SPEED_THRESHOLD) return 1;
  const excess = speedMultAt(speedLevel) + clock2B - 1;
  if (excess <= 0) return 0;
  const stab = stabilityAt(stabilityLevel);
  const raw = Math.max(0, Math.min(1, excess / (excess + stab) - clock4Red));
  // Effective entropy amplified by lifetime PP spent (mirrors GameEngine._entropyAt)
  const exponent = 1 + P.lifetimePPSpent * PRESTIGE_ENTROPY_PP_SCALING;
  return 1 - Math.pow(1 - raw, exponent);
};

const tePenaltyOf = (ent) => {
  if (ent < ENTROPY_TE_PENALTY_THRESHOLD) return 0;
  const t = (ent - ENTROPY_TE_PENALTY_THRESHOLD) / (1 - ENTROPY_TE_PENALTY_THRESHOLD);
  return ENTROPY_TE_PENALTY_AT_THRESHOLD + t * (ENTROPY_TE_PENALTY_AT_MAX - ENTROPY_TE_PENALTY_AT_THRESHOLD);
};

const boostFactorAt = (level) => {
  const clamped = Math.min(level, BOOST_MAX_LEVEL);
  return CLOCK_SPEED_FACTOR + clamped * (BOOST_SPEED_FACTOR_MAX - CLOCK_SPEED_FACTOR) / BOOST_MAX_LEVEL;
};

const entropyReduceFactor = () => 1 - P.entropyReduceLevel / PRESTIGE_ENTROPY_REDUCE_MAX;

const epsOf = (s) => {
  const sm = speedMultAt(s.speedLevel) + s.clock2B;
  const ent = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);
  const rps = sm / (BASE_REVOLUTION_MS / 1000);
  const penalty = tePenaltyOf(ent) * entropyReduceFactor();
  const resonanceBonus = ent >= PRESTIGE_ENTROPY_BONUS_THRESHOLD
    ? P.entropyTeLevel * PRESTIGE_ENTROPY_TE_BONUS : 0;
  return rps * energyPerRevAt(s.energyLevel, s.clock3TeB) * Math.max(0, 1 - penalty + resonanceBonus);
};

const debuffChanceOf = (ent) => ent < ENTROPY_DEBUFF_THRESHOLD ? 0
  : ENTROPY_DEBUFF_CHANCE_MIN + (ent - ENTROPY_DEBUFF_THRESHOLD) / (1 - ENTROPY_DEBUFF_THRESHOLD) * (ENTROPY_DEBUFF_CHANCE_MAX - ENTROPY_DEBUFF_CHANCE_MIN);

const effectiveEPS = (s) => {
  const base = epsOf(s);
  const sm = speedMultAt(s.speedLevel) + s.clock2B;
  const ent = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);
  const ftPeriodMs = BASE_REVOLUTION_MS / sm * (60 / 59);
  const ftFrac = Math.min(1, FAST_TIME_DURATION_MS / ftPeriodMs);
  const dc = debuffChanceOf(ent) * entropyReduceFactor();
  const ftDelta = ftFrac * ((1 - dc) * (FAST_TIME_MULTIPLIER - 1) + dc * (FAST_TIME_DEBUFF_MULTIPLIER - 1));
  let reverseDrain = 0;
  if (ent >= REVERSE_ENTROPY_THRESHOLD) {
    const t = (ent - REVERSE_ENTROPY_THRESHOLD) / (1 - REVERSE_ENTROPY_THRESHOLD);
    const chance = (REVERSE_CHANCE_AT_THRESHOLD + t * (REVERSE_CHANCE_AT_MAX - REVERSE_CHANCE_AT_THRESHOLD)) * entropyReduceFactor();
    const durMs = REVERSE_DURATION_AT_THRESHOLD + t * (REVERSE_DURATION_AT_MAX - REVERSE_DURATION_AT_THRESHOLD);
    reverseDrain = chance * (durMs / (BASE_REVOLUTION_MS / sm)) * base;
  }
  return Math.max(0, base * (1 + ftDelta) - reverseDrain);
};

const costs = {
  speed: (s) => Math.floor(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_EXPONENT, s.speedLevel)),
  energy: (s) => Math.floor(ENERGY_UPGRADE_BASE_COST * Math.pow(ENERGY_UPGRADE_COST_EXPONENT, s.energyLevel)),
  clock: (s) => Math.floor(CLOCK_UPGRADE_BASE_COST * Math.pow(CLOCK_UPGRADE_COST_EXPONENT, s.clockCount - 1)),
  boost: (s) => Math.floor(BOOST_UPGRADE_BASE_COST * Math.pow(BOOST_UPGRADE_COST_EXPONENT, s.boostLevel)),
  stability: (s) => Math.floor(STABILITY_UPGRADE_BASE_COST * Math.pow(STABILITY_UPGRADE_COST_EXPONENT, s.stabilityLevel)),
};

// ── Simulation run state (reset on prestige) ──────────────────────────────────

const S = {
  ms: 0, energy: 0,
  speedLevel: 0, energyLevel: 0,
  clockCount: 1, boostLevel: 0, stabilityLevel: 0,
  clock2B: 0, clock3TeB: 0, clock4Red: 0,
  timeDust: 0, totalRevs: 0, extraRevs: [],
};

const MAX_HOURS = parseFloat(process.argv[2] ?? '4');
const MAX_MS = MAX_HOURS * 3_600_000;
const TD_INTERVAL = 720 / 11; // ≈65.45 main-clock revolutions per TD event

// ── Strategies ────────────────────────────────────────────────────────────────

const STRATEGIES = {
  greedy: { label: 'Greedy (best ROI)', speedW: 1, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  speed: { label: 'Speed Focus (3× speed priority)', speedW: 3, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  energy: { label: 'Energy Focus (3× energy priority)', speedW: 1, energyW: 3, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  safe: { label: 'Entropy Safe (buy stability early)', speedW: 1, energyW: 1, stabilityW: 3, stabThresh: 0.1 },
};
const STRATEGY_KEY = process.argv[3] ?? 'greedy';
if (!STRATEGIES[STRATEGY_KEY]) {
  console.error(`Unknown strategy "${STRATEGY_KEY}". Valid: ${Object.keys(STRATEGIES).join(', ')}`);
  process.exit(1);
}
const STRATEGY = STRATEGIES[STRATEGY_KEY];

// ── Tracking ──────────────────────────────────────────────────────────────────

const milestones = [];
const snapshots = [];
const seen = new Set();
let totalTeSpent = 0;

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, '0');
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};
const mark = (label) => milestones.push({ ms: S.ms, label });
const once = (key, label) => { if (!seen.has(key)) { seen.add(key); mark(label); } };

// ── Prestige helpers ──────────────────────────────────────────────────────────

const pCost = (base, scale, level) => Math.ceil(base * Math.pow(scale, level));

// Prestige upgrades in priority order: cheapest/most impactful first.
// The simulation buys them greedily after each prestige.
const PRESTIGE_UPGRADES = [
  { key: 'speedLevel', base: PRESTIGE_SPEED_BASE_COST, scale: PRESTIGE_SPEED_SCALING, max: Infinity },
  { key: 'energyLevel', base: PRESTIGE_ENERGY_BASE_COST, scale: PRESTIGE_ENERGY_SCALING, max: Infinity },
  { key: 'anchorLevel', base: PRESTIGE_ANCHOR_BASE_COST, scale: PRESTIGE_ANCHOR_SCALING, max: Infinity },
  { key: 'entropyReduceLevel', base: PRESTIGE_ENTROPY_REDUCE_BASE_COST, scale: PRESTIGE_ENTROPY_REDUCE_SCALING, max: PRESTIGE_ENTROPY_REDUCE_MAX },
  { key: 'tdLevel', base: PRESTIGE_TD_BASE_COST, scale: PRESTIGE_TD_SCALING, max: Infinity },
  { key: 'boostLevel', base: PRESTIGE_BOOST_BASE_COST, scale: PRESTIGE_BOOST_SCALING, max: BOOST_MAX_LEVEL },
  { key: 'clockLevel', base: PRESTIGE_CLOCK_BASE_COST, scale: PRESTIGE_CLOCK_SCALING, max: CLOCK_MAX_EXTRA },
  { key: 'ascendLevel', base: PRESTIGE_ASCEND_BASE_COST, scale: PRESTIGE_ASCEND_COST_SCALING, max: PRESTIGE_ASCEND_MAX },
  { key: 'entropyTeLevel', base: PRESTIGE_ENTROPY_TE_BASE_COST, scale: PRESTIGE_ENTROPY_TE_SCALING, max: PRESTIGE_ENTROPY_TE_MAX },
  { key: 'entropyTdLevel', base: PRESTIGE_ENTROPY_TD_BASE_COST, scale: PRESTIGE_ENTROPY_TD_SCALING, max: PRESTIGE_ENTROPY_TD_MAX },
  { key: 'singularityLevel', base: PRESTIGE_SINGULARITY_COST, scale: 1, max: 1 },
];

function buyPrestigeUpgrades() {
  let bought = true;
  while (bought) {
    bought = false;
    // Find cheapest affordable upgrade not yet at max
    let best = null, bestCost = Infinity;
    for (const upg of PRESTIGE_UPGRADES) {
      if (P[upg.key] >= upg.max) continue;
      const cost = pCost(upg.base, upg.scale, P[upg.key]);
      if (cost <= P.points && cost < bestCost) { bestCost = cost; best = upg; }
    }
    if (best) {
      P.points -= bestCost;
      P.lifetimePPSpent += bestCost;
      P[best.key]++;
      bought = true;
    }
  }
}

function doPrestige() {
  const ent = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
  const ppCoeff = 1 + P.ascendLevel * PRESTIGE_ASCEND_BOOST;
  const ppGain = Math.floor(S.timeDust * (1 + ent * ppCoeff));
  P.points += ppGain;
  P.count++;

  // Spend PP immediately
  const ppBefore = P.points;
  buyPrestigeUpgrades();
  const ppSpent = ppBefore - P.points;

  mark(
    `★ PRESTIGE #${P.count} — +${ppGain} PP (${P.points} left after spend, ${ppSpent} spent) | ` +
    `TD ${S.timeDust.toFixed(1)} | ent ${(ent * 100).toFixed(0)}% | ` +
    `Shield Lv${P.entropyReduceLevel} | SpeedBoost Lv${P.speedLevel}`
  );

  // Reset run state, apply prestige boosts
  S.energy = 0;
  S.speedLevel = P.speedLevel;
  S.energyLevel = P.energyLevel;
  S.clockCount = 1 + P.clockLevel;
  S.boostLevel = P.boostLevel;
  S.stabilityLevel = P.anchorLevel;
  S.clock2B = 0;
  S.clock3TeB = 0;
  S.clock4Red = 0;
  S.timeDust = 0;
  S.totalRevs = 0;
  S.extraRevs = Array(P.clockLevel).fill(0);
  // Clear per-run seen flags so entropy zones re-trigger
  seen.delete('ent40'); seen.delete('ent60'); seen.delete('ent80');
}

// ── Player run strategy ───────────────────────────────────────────────────────

function pickUpgrade() {
  const { speedW, energyW, stabilityW, stabThresh } = STRATEGY;
  const curEPS = effectiveEPS(S);
  const ent = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
  const sm = speedMultAt(S.speedLevel) + S.clock2B;
  let best = null;
  const consider = (type, cost, dEPS) => {
    if (S.energy < cost) return;
    const eff = dEPS / cost;
    if (!best || eff > best.eff) best = { type, cost, eff };
  };
  consider('speed', costs.speed(S), (effectiveEPS({ ...S, speedLevel: S.speedLevel + 1 }) - curEPS) * speedW);
  consider('energy', costs.energy(S), (effectiveEPS({ ...S, energyLevel: S.energyLevel + 1 }) - curEPS) * energyW);
  if (ent > stabThresh && S.stabilityLevel < 20) {
    const dEPS = effectiveEPS({ ...S, stabilityLevel: S.stabilityLevel + 1 }) - curEPS;
    const urgency = ent > REVERSE_ENTROPY_THRESHOLD ? 3 : ent > 0.5 ? 2 : 1;
    consider('stability', costs.stability(S), dEPS * urgency * stabilityW);
  }
  if (S.clockCount - 1 < CLOCK_MAX_EXTRA) {
    const idx = S.clockCount - 1;
    const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
    const bRatio = boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR;
    const clockRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[idx] * bRatio;
    let projectedDEPS;
    if (idx === 0) projectedDEPS = clockRPS * CLOCK2_SPEED_BONUS * (curEPS / sm) * 60;
    else if (idx === 1) projectedDEPS = clockRPS * CLOCK3_TE_BONUS * (sm / (BASE_REVOLUTION_MS / 1000)) * 60;
    else projectedDEPS = clockRPS * CLOCK4_ENTROPY_REDUCTION * curEPS * 60;
    consider('clock', costs.clock(S), projectedDEPS);
  }
  if (S.boostLevel < BOOST_MAX_LEVEL && S.clockCount > 1) {
    const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
    let projectedDEPS = 0;
    for (let i = 0; i < S.extraRevs.length; i++) {
      const oldRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[i] * (boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR);
      const newRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[i] * (boostFactorAt(S.boostLevel + 1) / CLOCK_SPEED_FACTOR);
      const dRPS = newRPS - oldRPS;
      if (i === 0) projectedDEPS += dRPS * CLOCK2_SPEED_BONUS * (curEPS / sm) * 60;
      else if (i === 1) projectedDEPS += dRPS * CLOCK3_TE_BONUS * (sm / (BASE_REVOLUTION_MS / 1000)) * 60;
    }
    consider('boost', costs.boost(S), projectedDEPS);
  }
  return best;
}

function applyUpgrade(u) {
  S.energy -= u.cost;
  totalTeSpent += u.cost;
  let lvl;
  switch (u.type) {
    case 'speed': S.speedLevel++; lvl = S.speedLevel; break;
    case 'energy': S.energyLevel++; lvl = S.energyLevel; break;
    case 'clock': S.clockCount++; S.extraRevs.push(0); lvl = S.clockCount - 1; break;
    case 'boost': S.boostLevel++; lvl = S.boostLevel; break;
    case 'stability': S.stabilityLevel++; lvl = S.stabilityLevel; break;
  }
  const sm = (speedMultAt(S.speedLevel) + S.clock2B).toFixed(2);
  const eps = effectiveEPS(S).toFixed(3);
  const ent = (entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red) * 100).toFixed(0);
  mark(`${u.type.padEnd(9)} Lv${String(lvl).padStart(2)} | cost ${String(u.cost).padStart(6)} TE | ${sm}× | ${eps} TE/s | ent ${ent}%`);
}

// ── Main loop ─────────────────────────────────────────────────────────────────

mark(`Start  —  1× | ${effectiveEPS(S).toFixed(3)} TE/s`);

const SNAPSHOT_INTERVAL_MS = 5 * 60_000;
let lastSnapshotMs = -SNAPSHOT_INTERVAL_MS;

while (S.ms < MAX_MS) {
  // Prestige as soon as possible
  if (S.timeDust >= PRESTIGE_COST_TD) {
    doPrestige();
    continue; // re-evaluate immediately after reset
  }

  let upg;
  while ((upg = pickUpgrade())) applyUpgrade(upg);

  const ent = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
  if (ent >= 0.40) once('ent40', `⚠  Entropy ≥ 40% — debuffs + fracture active (modeled)`);
  if (ent >= 0.60) once('ent60', `⚠  Entropy ≥ 60% — Reverse Time active (modeled)`);
  if (ent >= 0.80) once('ent80', `⚠  Entropy ≥ 80%`);

  if (S.ms - lastSnapshotMs >= SNAPSHOT_INTERVAL_MS) {
    lastSnapshotMs = S.ms;
    const sm = speedMultAt(S.speedLevel) + S.clock2B;
    snapshots.push({
      ms: S.ms, pct: P.count,
      spd: S.speedLevel, sm: sm.toFixed(2),
      eps: effectiveEPS(S).toFixed(3), nrg: Math.floor(S.energy),
      ent: (ent * 100).toFixed(0) + '%', td: S.timeDust.toFixed(1),
      clk: S.clockCount, pp: P.points,
    });
  }

  const eps = effectiveEPS(S);
  const allCosts = [
    costs.speed(S), costs.energy(S),
    S.clockCount - 1 < CLOCK_MAX_EXTRA ? costs.clock(S) : Infinity,
    S.boostLevel < BOOST_MAX_LEVEL && S.clockCount > 1 ? costs.boost(S) : Infinity,
    ent > FRACTURE_ENTROPY_THRESHOLD ? costs.stability(S) : Infinity,
  ].filter(isFinite);
  const cheapest = Math.min(...allCosts);

  let stepMs = 1000;
  if (eps > 0 && cheapest > S.energy) {
    const waitMs = (cheapest - S.energy) / eps * 1000;
    if (waitMs > 2000) stepMs = Math.min(waitMs * 0.9, 30_000);
  }
  stepMs = Math.min(stepMs, MAX_MS - S.ms);
  if (stepMs <= 0) break;

  const sm = speedMultAt(S.speedLevel) + S.clock2B;
  const prevRevs = S.totalRevs;
  const deltaRevs = sm * stepMs / BASE_REVOLUTION_MS;
  S.energy += eps * stepMs / 1000;
  S.totalRevs += deltaRevs;
  S.ms += stepMs;

  const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
  const bRatio = boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR;
  for (let i = 0; i < S.extraRevs.length; i++) {
    const prev = S.extraRevs[i];
    S.extraRevs[i] += deltaRevs * EXTRA_BASE[i] * bRatio;
    const completed = Math.floor(S.extraRevs[i]) - Math.floor(prev);
    if (completed > 0) {
      if (i === 0) S.clock2B += completed * CLOCK2_SPEED_BONUS;
      else if (i === 1) S.clock3TeB += completed * CLOCK3_TE_BONUS;
      else if (i === 2) S.clock4Red = Math.min(1, S.clock4Red + completed * CLOCK4_ENTROPY_REDUCTION);
    }
  }

  const tdBefore = Math.floor(prevRevs / TD_INTERVAL);
  const tdAfter = Math.floor(S.totalRevs / TD_INTERVAL);
  if (tdAfter > tdBefore) {
    const newEvents = tdAfter - tdBefore;
    const chaosBonus = ent >= PRESTIGE_ENTROPY_BONUS_THRESHOLD
      ? P.entropyTdLevel * PRESTIGE_ENTROPY_TD_BONUS : 0;
    S.timeDust += newEvents * (1 + P.tdLevel * PRESTIGE_TD_BONUS) * (1 + chaosBonus);
    if (ent >= FRACTURE_ENTROPY_THRESHOLD) {
      const t = (ent - FRACTURE_ENTROPY_THRESHOLD) / (1 - FRACTURE_ENTROPY_THRESHOLD);
      const lossRate = (FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD))
        * entropyReduceFactor();
      if (lossRate > 0) for (let i = 0; i < newEvents; i++) S.energy = Math.max(0, S.energy * (1 - lossRate));
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

const W = 80;
const HR = '─'.repeat(W);

console.log(`\n${'═'.repeat(W)}`);
console.log(` ChronoForge Progression Simulator  —  ${MAX_HOURS}h`);
console.log(`${'═'.repeat(W)}`);
console.log(` Strategy : ${STRATEGY.label}`);
console.log(` Events   : Fast Time / Fracture / Reverse modeled as expected value`);
console.log(` Prestige : fires at ${PRESTIGE_COST_TD} TD; PP spent greedily (cheapest upgrade first)\n`);

console.log(`MILESTONES\n${HR}`);
for (const { ms, label } of milestones) {
  console.log(` ${fmt(ms).padEnd(10)}  ${label}`);
}

console.log(`\nSNAPSHOTS  (every 5 min)\n${HR}`);
console.log(` ${'Time'.padEnd(10)} ${'P#'.padEnd(4)} ${'SpdLv'.padEnd(6)} ${'×spd'.padEnd(8)} ${'TE/s'.padEnd(10)} ${'Energy'.padEnd(10)} ${'Ent%'.padEnd(7)} ${'TD'.padEnd(7)} PP`);
console.log(HR);
for (const s of snapshots) {
  console.log(` ${fmt(s.ms).padEnd(10)} ${String(s.pct).padEnd(4)} ${String(s.spd).padEnd(6)} ${s.sm.padEnd(8)} ${s.eps.padEnd(10)} ${String(s.nrg).padEnd(10)} ${s.ent.padEnd(7)} ${s.td.padEnd(7)} ${s.pp}`);
}

const finalEnt = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
const finalSM = speedMultAt(S.speedLevel) + S.clock2B;
console.log(`\nFINAL STATE  at ${fmt(S.ms)}\n${HR}`);
console.log(` Prestige count  : ${P.count}`);
console.log(` Prestige points : ${P.points} available, ${P.lifetimePPSpent} lifetime spent`);
console.log(` Entropy Shield  : Lv${P.entropyReduceLevel}/${PRESTIGE_ENTROPY_REDUCE_MAX}  (reduce factor ${(entropyReduceFactor() * 100).toFixed(0)}%)`);
console.log(` Speed boost     : Lv${P.speedLevel}  Energy boost: Lv${P.energyLevel}  Anchor boost: Lv${P.anchorLevel}`);
console.log(` Clock boost     : Lv${P.clockLevel}  Boost boost: Lv${P.boostLevel}   Extra TD: Lv${P.tdLevel}`);
console.log(` Tier 3 — Resonance: Lv${P.entropyTeLevel}  Harvest: Lv${P.entropyTdLevel}  Ascendance: Lv${P.ascendLevel}`);
console.log(` Singularity     : ${P.singularityLevel > 0 ? 'UNLOCKED' : 'locked'}`);
console.log(``);
console.log(` Run state at end:`);
console.log(`  Speed     : Lv${S.speedLevel} (${speedMultAt(S.speedLevel).toFixed(2)}× base + ${S.clock2B.toFixed(2)} clock2 = ${finalSM.toFixed(2)}× total)`);
console.log(`  TE/s      : ${effectiveEPS(S).toFixed(4)}`);
console.log(`  Entropy   : ${(finalEnt * 100).toFixed(1)}%  (lifetimePP ${P.lifetimePPSpent})`);
console.log(`  TimeDust  : ${S.timeDust.toFixed(1)} TD`);
console.log('');
