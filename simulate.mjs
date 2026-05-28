// simulate.mjs — ChronoForge headless progression simulator
// Usage: node simulate.mjs [max_hours=2]
//
// Models: upgrades, entropy, extra clock bonuses, TimeDust, and expected-value of:
//   Fast Time buff (+speed) / debuff (-speed), Time Fracture (TE drain), Reverse Time (TE drain).
// Temporal Surge excluded (rare, hard to model without tracking hand angles).
// Player strategy: greedy (best marginal TE/s per TE cost) + immediate clock priority.

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
  REVERSE_ENTROPY_THRESHOLD, REVERSE_CHANCE_AT_THRESHOLD, REVERSE_CHANCE_AT_MAX,
  REVERSE_DURATION_AT_THRESHOLD, REVERSE_DURATION_AT_MAX,
} from './src/game/constants.js';

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
  const excess = speedMultAt(speedLevel) + clock2B - 1;
  if (excess <= 0) return 0;
  const stab = stabilityAt(stabilityLevel);
  return Math.max(0, Math.min(1, excess / (excess + stab) - clock4Red));
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

const epsOf = (s) => {
  const sm = speedMultAt(s.speedLevel) + s.clock2B;
  const ent = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);
  const rps = sm / (BASE_REVOLUTION_MS / 1000);
  return rps * energyPerRevAt(s.energyLevel, s.clock3TeB) * (1 - tePenaltyOf(ent));
};

// Expected-value adjustments for random events
const debuffChanceOf = (ent) => ent < ENTROPY_DEBUFF_THRESHOLD ? 0
  : ENTROPY_DEBUFF_CHANCE_MIN + (ent - ENTROPY_DEBUFF_THRESHOLD) / (1 - ENTROPY_DEBUFF_THRESHOLD) * (ENTROPY_DEBUFF_CHANCE_MAX - ENTROPY_DEBUFF_CHANCE_MIN);

// Wraps epsOf with Fast Time and Reverse Time expected-value corrections.
// Fast Time fires every 60/59 revolutions (second/minute overlap); lasts FAST_TIME_DURATION_MS.
// Reverse Time fires per forward revolution with a chance; drains TE at the same rate as forward.
const effectiveEPS = (s) => {
  const base = epsOf(s);
  const sm   = speedMultAt(s.speedLevel) + s.clock2B;
  const ent  = entropyOf(s.speedLevel, s.clock2B, s.stabilityLevel, s.clock4Red);

  // Fast Time: fraction of time active, split into buff/debuff
  const ftPeriodMs = BASE_REVOLUTION_MS / sm * (60 / 59);
  const ftFrac     = Math.min(1, FAST_TIME_DURATION_MS / ftPeriodMs);
  const dc         = debuffChanceOf(ent);
  const ftDelta    = ftFrac * ((1 - dc) * (FAST_TIME_MULTIPLIER - 1) + dc * (FAST_TIME_DEBUFF_MULTIPLIER - 1));

  // Reverse Time: expected TE drain per second
  let reverseDrain = 0;
  if (ent >= REVERSE_ENTROPY_THRESHOLD) {
    const t      = (ent - REVERSE_ENTROPY_THRESHOLD) / (1 - REVERSE_ENTROPY_THRESHOLD);
    const chance = REVERSE_CHANCE_AT_THRESHOLD + t * (REVERSE_CHANCE_AT_MAX - REVERSE_CHANCE_AT_THRESHOLD);
    const durMs  = REVERSE_DURATION_AT_THRESHOLD + t * (REVERSE_DURATION_AT_MAX - REVERSE_DURATION_AT_THRESHOLD);
    reverseDrain = chance * (durMs / (BASE_REVOLUTION_MS / sm)) * base;
  }

  return Math.max(0, base * (1 + ftDelta) - reverseDrain);
};

// Next-level costs
const costs = {
  speed: (s) => Math.floor(UPGRADE_BASE_COST * Math.pow(UPGRADE_COST_EXPONENT, s.speedLevel)),
  energy: (s) => Math.floor(ENERGY_UPGRADE_BASE_COST * Math.pow(ENERGY_UPGRADE_COST_EXPONENT, s.energyLevel)),
  clock: (s) => Math.floor(CLOCK_UPGRADE_BASE_COST * Math.pow(CLOCK_UPGRADE_COST_EXPONENT, s.clockCount - 1)),
  boost: (s) => Math.floor(BOOST_UPGRADE_BASE_COST * Math.pow(BOOST_UPGRADE_COST_EXPONENT, s.boostLevel)),
  stability: (s) => Math.floor(STABILITY_UPGRADE_BASE_COST * Math.pow(STABILITY_UPGRADE_COST_EXPONENT, s.stabilityLevel)),
};

// ── Simulation state ──────────────────────────────────────────────────────────

const S = {
  ms: 0,
  energy: 0,
  speedLevel: 0, energyLevel: 0,
  clockCount: 1, boostLevel: 0, stabilityLevel: 0,
  clock2B: 0, clock3TeB: 0, clock4Red: 0,
  timeDust: 0,
  totalRevs: 0,
  extraRevs: [],
};

const MAX_HOURS = parseFloat(process.argv[2] ?? '2');
const MAX_MS = MAX_HOURS * 3_600_000;
const TD_INTERVAL = 720 / 11; // ≈65.45 main-clock revolutions per TimeDust event

// ── Playstyle strategies ──────────────────────────────────────────────────────
// Usage: node simulate.mjs [hours] [strategy]
// speedW/energyW/stabilityW: multipliers on the efficiency score for each upgrade type.
// stabThresh: entropy level at which stability purchases are considered at all.
const STRATEGIES = {
  greedy: { label: 'Greedy (best ROI)',                 speedW: 1, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  speed:  { label: 'Speed Focus (3× speed priority)',   speedW: 3, energyW: 1, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  energy: { label: 'Energy Focus (3× energy priority)', speedW: 1, energyW: 3, stabilityW: 1, stabThresh: FRACTURE_ENTROPY_THRESHOLD },
  safe:   { label: 'Entropy Safe (buy stability early)', speedW: 1, energyW: 1, stabilityW: 3, stabThresh: 0.1 },
};
const STRATEGY_KEY = process.argv[3] ?? 'greedy';
if (!STRATEGIES[STRATEGY_KEY]) {
  console.error(`Unknown strategy "${STRATEGY_KEY}". Valid: ${Object.keys(STRATEGIES).join(', ')}`);
  process.exit(1);
}
const STRATEGY = STRATEGIES[STRATEGY_KEY];

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

// ── Player strategy ───────────────────────────────────────────────────────────
// Greedy: highest (marginal TE/s gain) / cost.
// Clocks are valued by their projected bonus accumulation over a 60-second window.
// Stability is only considered once entropy is a real drag (> 35%).

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

  // Speed upgrade
  consider('speed', costs.speed(S), (effectiveEPS({ ...S, speedLevel: S.speedLevel + 1 }) - curEPS) * speedW);

  // Energy upgrade
  consider('energy', costs.energy(S), (effectiveEPS({ ...S, energyLevel: S.energyLevel + 1 }) - curEPS) * energyW);

  // Stability — threshold and weight come from the active strategy
  if (ent > stabThresh && S.stabilityLevel < 20) {
    const dEPS = effectiveEPS({ ...S, stabilityLevel: S.stabilityLevel + 1 }) - curEPS;
    const urgencyBoost = ent > REVERSE_ENTROPY_THRESHOLD ? 3 : ent > 0.5 ? 2 : 1;
    consider('stability', costs.stability(S), dEPS * urgencyBoost * stabilityW);
  }

  // Clock — value = projected bonus accumulation over 60 seconds
  if (S.clockCount - 1 < CLOCK_MAX_EXTRA) {
    const idx = S.clockCount - 1; // 0=clock2, 1=clock3, 2=clock4
    const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
    const bRatio = boostFactorAt(S.boostLevel) / CLOCK_SPEED_FACTOR;
    const clockRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[idx] * bRatio;
    let projectedDEPS;
    if (idx === 0) {
      // Clock 2: each rev adds CLOCK2_SPEED_BONUS to speed → EPS gain
      const dEPSPerSpeedUnit = curEPS / sm;
      projectedDEPS = clockRPS * CLOCK2_SPEED_BONUS * dEPSPerSpeedUnit * 60;
    } else if (idx === 1) {
      // Clock 3: each rev adds CLOCK3_TE_BONUS to TE/rev
      const mainRPS = sm / (BASE_REVOLUTION_MS / 1000);
      projectedDEPS = clockRPS * CLOCK3_TE_BONUS * mainRPS * 60;
    } else {
      // Clock 4: each rev reduces entropy, easing the penalty
      projectedDEPS = clockRPS * CLOCK4_ENTROPY_REDUCTION * curEPS * 60;
    }
    consider('clock', costs.clock(S), projectedDEPS);
  }

  // Boost — value = how much faster extra clocks compound their bonuses
  if (S.boostLevel < BOOST_MAX_LEVEL && S.clockCount > 1) {
    const oldFactor = boostFactorAt(S.boostLevel);
    const newFactor = boostFactorAt(S.boostLevel + 1);
    const EXTRA_BASE = [CLOCK2_BASE_SPEED, CLOCK3_BASE_SPEED, CLOCK4_BASE_SPEED];
    let projectedDEPS = 0;
    for (let i = 0; i < S.extraRevs.length; i++) {
      const oldClockRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[i] * (oldFactor / CLOCK_SPEED_FACTOR);
      const newClockRPS = (sm / (BASE_REVOLUTION_MS / 1000)) * EXTRA_BASE[i] * (newFactor / CLOCK_SPEED_FACTOR);
      const deltaRPS = newClockRPS - oldClockRPS;
      if (i === 0) projectedDEPS += deltaRPS * CLOCK2_SPEED_BONUS * (curEPS / sm) * 60;
      else if (i === 1) projectedDEPS += deltaRPS * CLOCK3_TE_BONUS * (sm / (BASE_REVOLUTION_MS / 1000)) * 60;
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
    case 'clock':
      S.clockCount++;
      S.extraRevs.push(0);
      lvl = S.clockCount - 1;
      break;
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
  // Buy every available upgrade before advancing time
  let upg;
  while ((upg = pickUpgrade())) applyUpgrade(upg);

  // One-time event flags
  const ent = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
  if (ent >= 0.40) once('ent40', `⚠  Entropy ≥ 40% — Fast Time debuffs + Fracture TE loss now active (modeled)`);
  if (ent >= 0.60) once('ent60', `⚠  Entropy ≥ 60% — Reverse Time now active (modeled)`);
  if (ent >= 0.80) once('ent80', `⚠  Entropy ≥ 80%`);
  if (S.timeDust >= PRESTIGE_COST_TD) once('prestige', `★  First prestige available (${Math.floor(S.timeDust)} TD ≥ ${PRESTIGE_COST_TD})`);

  // Periodic snapshot
  if (S.ms - lastSnapshotMs >= SNAPSHOT_INTERVAL_MS) {
    lastSnapshotMs = S.ms;
    const sm = speedMultAt(S.speedLevel) + S.clock2B;
    snapshots.push({
      ms: S.ms,
      spd: S.speedLevel,
      sm: sm.toFixed(2),
      eps: effectiveEPS(S).toFixed(3),
      nrg: Math.floor(S.energy),
      ent: (ent * 100).toFixed(0) + '%',
      td: Math.floor(S.timeDust),
      clk: S.clockCount,
      stab: S.stabilityLevel,
    });
  }

  // Fast-forward to next affordable upgrade (up to 30 s at a time)
  const eps = effectiveEPS(S);
  const allCosts = [
    costs.speed(S),
    costs.energy(S),
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

  // Advance time
  const sm = speedMultAt(S.speedLevel) + S.clock2B;
  const prevRevs = S.totalRevs;
  const deltaRevs = sm * stepMs / BASE_REVOLUTION_MS;
  S.energy += eps * stepMs / 1000;
  S.totalRevs += deltaRevs;
  S.ms += stepMs;

  // Extra clock revolution bonuses
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

  // TimeDust + Time Fracture: both fire on minute/hour overlap (~every 65.45 main revolutions)
  const tdBefore = Math.floor(prevRevs / TD_INTERVAL);
  const tdAfter  = Math.floor(S.totalRevs / TD_INTERVAL);
  if (tdAfter > tdBefore) {
    const newEvents = tdAfter - tdBefore;
    S.timeDust += newEvents;
    if (ent >= FRACTURE_ENTROPY_THRESHOLD) {
      const t        = (ent - FRACTURE_ENTROPY_THRESHOLD) / (1 - FRACTURE_ENTROPY_THRESHOLD);
      const lossRate = FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD);
      for (let i = 0; i < newEvents; i++) {
        S.energy = Math.max(0, S.energy * (1 - lossRate));
      }
    }
  }
}

// ── Output ────────────────────────────────────────────────────────────────────

const W = 78;
const HR = '─'.repeat(W);

console.log(`\n${'═'.repeat(W)}`);
console.log(` ChronoForge Progression Simulator  —  ${MAX_HOURS}h`);
console.log(`${'═'.repeat(W)}`);
console.log(` Strategy : ${STRATEGY.label}`);
console.log(` Events   : random events excluded (Fast Time/Fracture/Reverse flagged by zone)\n`);

console.log(`MILESTONES\n${HR}`);
for (const { ms, label } of milestones) {
  console.log(` ${fmt(ms).padEnd(10)}  ${label}`);
}

console.log(`\nSNAPSHOTS  (every 5 min)\n${HR}`);
console.log(` ${'Time'.padEnd(10)} ${'SpdLv'.padEnd(6)} ${'×spd'.padEnd(8)} ${'TE/s'.padEnd(10)} ${'Energy'.padEnd(10)} ${'Ent%'.padEnd(7)} ${'TD'.padEnd(5)} ${'Clks'.padEnd(6)} StabLv`);
console.log(HR);
for (const s of snapshots) {
  console.log(` ${fmt(s.ms).padEnd(10)} ${String(s.spd).padEnd(6)} ${s.sm.padEnd(8)} ${s.eps.padEnd(10)} ${String(s.nrg).padEnd(10)} ${s.ent.padEnd(7)} ${String(s.td).padEnd(5)} ${String(s.clk).padEnd(6)} ${s.stab}`);
}

const finalEnt = entropyOf(S.speedLevel, S.clock2B, S.stabilityLevel, S.clock4Red);
const finalSM = speedMultAt(S.speedLevel) + S.clock2B;
console.log(`\nFINAL STATE  at ${fmt(S.ms)}\n${HR}`);
console.log(` Speed      : Lv${S.speedLevel} base × ${speedMultAt(S.speedLevel).toFixed(2)} + clock2 bonus +${S.clock2B.toFixed(2)} = ${finalSM.toFixed(2)}× total`);
console.log(` TE/s (base): ${epsOf(S).toFixed(4)}`);
console.log(` TE/s (eff) : ${effectiveEPS(S).toFixed(4)}  (includes FT buff/debuff + Reverse drain)`);
console.log(` TE earned  : ${(S.energy + totalTeSpent).toFixed(1)} TE total  (${totalTeSpent.toFixed(1)} spent on upgrades, ${S.energy.toFixed(1)} unspent)`);
console.log(` Energy     : ${S.energy.toFixed(1)} TE`);
console.log(` Entropy    : ${(finalEnt * 100).toFixed(1)}%  (stability Lv${S.stabilityLevel}, value ${stabilityAt(S.stabilityLevel).toFixed(1)})`);
console.log(` TimeDust   : ${Math.floor(S.timeDust)} TD  (prestige needs ${PRESTIGE_COST_TD} TD)`);
console.log(` Clocks     : ${S.clockCount} / ${1 + CLOCK_MAX_EXTRA}  (extra bought via TE: ${S.clockCount - 1})`);
console.log(` Clock2 acc : +${S.clock2B.toFixed(2)}× speed (${Math.floor(S.clock2B / CLOCK2_SPEED_BONUS)} clock-2 revolutions)`);
console.log(` Clock3 acc : +${S.clock3TeB.toFixed(2)} TE/rev (${Math.floor(S.clock3TeB / CLOCK3_TE_BONUS)} clock-3 revolutions)`);
console.log(` Clock4 acc : -${(S.clock4Red * 100).toFixed(1)}% entropy`);
console.log(` Boost      : Lv${S.boostLevel} / ${BOOST_MAX_LEVEL}  (extra-clock speed factor ${boostFactorAt(S.boostLevel).toFixed(2)}×)`);

// Upcoming costs at end of simulation
console.log(`\nNEXT COSTS at sim end\n${HR}`);
const finalEPS = effectiveEPS(S);
const upcomingCosts = [
  ['Speed Lv' + (S.speedLevel + 1), costs.speed(S)],
  ['Energy Lv' + (S.energyLevel + 1), costs.energy(S)],
  S.clockCount - 1 < CLOCK_MAX_EXTRA && ['Clock ' + S.clockCount, costs.clock(S)],
  S.boostLevel < BOOST_MAX_LEVEL && ['Boost Lv' + (S.boostLevel + 1), costs.boost(S)],
  ['Stability Lv' + (S.stabilityLevel + 1), costs.stability(S)],
  ['Clock 3 (via TE)', Math.floor(CLOCK_UPGRADE_BASE_COST * Math.pow(CLOCK_UPGRADE_COST_EXPONENT, 1))],
].filter(Boolean);

for (const [name, cost] of upcomingCosts) {
  const timeToAfford = finalEPS > 0 ? Math.max(0, (cost - S.energy) / finalEPS) : Infinity;
  const wait = isFinite(timeToAfford) ? `(${fmt(timeToAfford * 1000)} from now)` : '(unaffordable)';
  console.log(` ${(name + ':').padEnd(22)} ${String(cost).padStart(8)} TE  ${wait}`);
}

// Balance notes
console.log(`\nBALANCE NOTES\n${HR}`);
if (CLOCK3_TE_BONUS !== 1) {
  console.log(` ⚠  CLOCK3_TE_BONUS = ${CLOCK3_TE_BONUS} but comment says 1 — verify intentional`);
}
const firstPrestigeMs = milestones.find(m => m.label.toLowerCase().includes('prestige'))?.ms;
if (!firstPrestigeMs) {
  console.log(` ⚠  First prestige NOT reachable in ${MAX_HOURS}h — consider reducing PRESTIGE_COST_TD or TD rate`);
} else {
  console.log(` ✓  First prestige available at ${fmt(firstPrestigeMs)}`);
}
const entryMs = milestones.find(m => m.label.includes('40%'))?.ms;
if (entryMs) console.log(` ✓  Entropy debuff zone entered at ${fmt(entryMs)}`);
const reverseMs = milestones.find(m => m.label.includes('60%'))?.ms;
if (reverseMs) console.log(` ✓  Reverse Time zone entered at ${fmt(reverseMs)}`);
else console.log(` ✓  Reverse Time zone never reached in ${MAX_HOURS}h (entropy stayed below 60%)`);
console.log('');
