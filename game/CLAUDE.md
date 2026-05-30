# CLAUDE.md — ChronoForge

## What this is

ChronoForge is a browser-based idle/clicker game. The player watches analog clocks spin; each full revolution of the main clock earns Time Energy (TE), which is spent on upgrades that make the clocks spin faster, earn more TE per revolution, or add more clocks. Clicking the clock area manually adds one second of game time to the main clock only. The game has an adversarial mechanic — Time Entropy — that grows with speed and introduces increasingly punishing events. A prestige system (spending Time Dust) resets each run but carries forward Prestige Points spent on permanent upgrades.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) + CSS custom properties |
| Build | Vite 8 |
| Lint | ESLint 10 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |
| Persistence | `localStorage` |

No TypeScript — the project is plain JavaScript (`.js`/`.jsx`).

## Architecture

```
GameEngine (pure simulation)
    ↓  _emitSnapshot() each frame
useGameStore (Zustand bridge)
    ↓  reactive state
React components (pure rendering)
```

### `src/game/GameEngine.js`

Vanilla JS class — zero React imports. Owns all simulation state, runs the `requestAnimationFrame` loop, and drives everything with delta-time. Communicates outward only via a snapshot callback registered by the store.

The singleton `gameEngine` is exported and used everywhere.

**Saved state fields** (persisted to `localStorage`):
`energy`, `speedLevel`, `energyLevel`, `clockCount`, `boostLevel`, `stabilityLevel`, `timeDust`, `totalRevolutions`, `extraRevolutions`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `prestigePoints`, `lifetimePPSpent`, all prestige upgrade levels (`prestigeSpeedLevel`, `prestigeEnergyLevel`, `prestigeClockLevel`, `prestigeBoostLevel`, `prestigeAnchorLevel`, `prestigeMirrorLevel`, `prestigeTdLevel`, `prestigeEntropyReduceLevel`, `prestigeEntropyTeLevel`, `prestigeEntropyTdLevel`, `prestigeAscendLevel`, `prestigeSingularityLevel`), `savedAt`

**Transient state** (not saved, reset to 0 on load):
`_fastTimeRemaining`, `_fastTimeIsDebuff`, `_fractureFlash`, `_surgeRemaining`, `_reverseTimeRemaining`, `_extraAngles`, `_prevNear`, `_prevHourMinNear`, `_prevSurgeNear`

**`_update(deltaMs, skipExtraClocks = false)`** — core loop step. Pass `skipExtraClocks = true` from `addSecond()` so manual clicks only advance the main clock.

**`getEntropyTeMultiplier()`** — combined TE multiplier for each revolution: `max(0, 1 − getEntropyTePenalty() + entropy × prestigeEntropyTeLevel × PRESTIGE_ENTROPY_TE_BONUS)`. Can exceed 1.0 when Temporal Resonance is active at high entropy. Used everywhere `(1 − tePenalty)` was previously used.

**`_entropyReduceFactor()`** — returns `1 − prestigeEntropyReduceLevel / PRESTIGE_ENTROPY_REDUCE_MAX`. Multiplied into every negative entropy effect (TE penalty, debuff chance, fracture loss, reverse time chance). At Entropy Shield Lv10 = 0 (all negative effects suppressed).

### `src/store/useGameStore.js`

The Zustand bridge. Registers a tick callback at module load time; every frame the engine pushes a snapshot and the store updates React state. Actions (`buyUpgrade`, `addSecond`, etc.) call engine methods directly — the next snapshot propagates results back.

### `src/hooks/useGameEngine.js`

A single `useEffect` that mounts/unmounts the engine: loads save, starts the RAF loop, wires `visibilitychange` to pause when the tab is hidden (offline progress credited on resume).

### `src/game/constants.js`

All tunable game-balance values. Never put magic numbers inline — change here. Sections: Core / Upgrades / Entropy / Events / Prestige (Tier 1–4) / Reverse Time / System.

### Components (`src/components/`)

All purely presentational — receive props, render, no game state, no engine calls.

- **`Clock.jsx`** — SVG analog clock, three hands (no tail — hands start at centre), tick marks, glow. Receives `angle` (0–360°) and `totalRevolutions`. Mirror hand (when `showMirror`) is fractured at two points: inner segment straight, mid segment +4° offset, tip −4° offset relative to mid, with decreasing opacity toward the tip.
- **`ExtraClock.jsx`** — Minimal orbiting-dot display for extra clocks. No face fill, no tick marks — just a glowing teal ring track, a thin arm from centre, a bright dot at the circumference, and a short comet trail. Receives `angle` and `size` only.
- **`EnergyDisplay.jsx`** — Shows TE, TE/s rate, and TimeDust count.
- **`UpgradePanel.jsx`** — Five upgrade cards in a 2-column grid (Anchor Time spans full width).
- **`StatsBar.jsx`** — Top bar: total revolutions and current speed %. Shows gold ⚡ for Fast Time buff, red 🔻 for Fast Time debuff, with matching border/shadow colors.
- **`PrestigeModal.jsx`** — Modal for prestiging and spending Prestige Points on prestige upgrades across four tiers. Stays open after prestiging so the player can spend PP immediately.

**Layout:** Main clock centred with click handler for `addSecond`. Extra clocks appear in a vertical column to the right (fixed 90 px each), not in the same row as the main clock.

## Game mechanics

### Resources

- **Time Energy (TE)** — primary currency; earned every main clock revolution only.
- **Time Dust (TD)** — rare resource; earned when minute and hour hands overlap on the main clock (~every 65.45 main-clock revolutions). TD yield per event: `TIMEDUST_BASE_YIELD × (1 + prestigeTdLevel × PRESTIGE_TD_BONUS) × (1 + entropy × prestigeEntropyTdLevel × PRESTIGE_ENTROPY_TD_BONUS)` — the Chaos Harvest factor only applies when `entropy ≥ PRESTIGE_ENTROPY_BONUS_THRESHOLD` (0.70).

### Upgrades (all in `UpgradePanel`)

| Upgrade | Effect | Key constants |
|---|---|---|
| Accelerate Time | Increases main clock speed multiplier | `UPGRADE_BASE_COST`, `UPGRADE_COST_EXPONENT`, `UPGRADE_SPEED_BONUS`, `UPGRADE_SPEED_BONUS_SCALING` |
| Improve Time | Increases TE per revolution | `ENERGY_UPGRADE_BASE_COST`, `ENERGY_UPGRADE_COST_EXPONENT`, `ENERGY_UPGRADE_VALUE_BONUS`, `ENERGY_UPGRADE_VALUE_SCALING` |
| Add Clock | Adds an extra clock (max 3 extra) | `CLOCK_UPGRADE_BASE_COST`, `CLOCK_UPGRADE_COST_EXPONENT`, `CLOCK_MAX_EXTRA` |
| Boost Clocks | Increases base speed factor for all extra clocks | `BOOST_UPGRADE_BASE_COST`, `BOOST_UPGRADE_COST_EXPONENT`, `BOOST_MAX_LEVEL` |
| Anchor Time | Reduces Time Entropy by increasing stability | `STABILITY_UPGRADE_BASE_COST`, `STABILITY_UPGRADE_COST_EXPONENT`, `ENTROPY_BASE_STABILITY`, `ENTROPY_STABILITY_SCALING` |

### Extra clocks

Up to 3 extra clocks. Each has a fixed base speed and a unique permanent effect that accumulates on every revolution of that clock. Extra clocks do **not** generate TE or TD and are **not** affected by manual clicks. They render as `ExtraClock` (orbiting dot), not the full `Clock` component.

| Clock | Base speed | Effect per revolution |
|---|---|---|
| Clock 2 | 0.10× main | +`CLOCK2_SPEED_BONUS` (0.01) additive speed bonus |
| Clock 3 | 0.05× main | +`CLOCK3_TE_BONUS` (1) TE/rev |
| Clock 4 | 0.001× main | −`CLOCK4_ENTROPY_REDUCTION` (1%) raw entropy |

All extra clock speeds are scaled by the boost ratio: `speed = BASE_SPEED × (getExtraClockSpeedFactor() / CLOCK_SPEED_FACTOR)`.

`totalRevolutions` in the snapshot counts **main clock only**.

### Time Entropy

**Raw entropy:** `rawEntropy = max(0, (speedMult − 1) / (speedMult − 1 + stability) − clock4EntropyReduction)`

**Effective entropy (used everywhere):** `1 − (1 − raw)^(1 + lifetimePPSpent × K)`

**Temporal Singularity override:** if `_prestigeSingularityLevel > 0` and `speedMult ≥ PRESTIGE_SINGULARITY_SPEED_THRESHOLD` (1000×), `getEntropy()` returns `1.0` exactly, bypassing the formula.

- Always 0 at base speed. Approaches 1 asymptotically as speed grows (without Singularity).
- `stability = ENTROPY_BASE_STABILITY × ENTROPY_STABILITY_SCALING^stabilityLevel`
- `K = PRESTIGE_ENTROPY_PP_SCALING` (0.01).
- Displayed as a color-coded bar (green → orange → red).

**TE multiplier (per revolution):** `getEntropyTeMultiplier() = max(0, 1 − tePenalty + bonus)` where:
- `tePenalty = base_penalty × _entropyReduceFactor()` (Entropy Shield reduces this toward 0)
- `bonus = entropy × prestigeEntropyTeLevel × PRESTIGE_ENTROPY_TE_BONUS` only when `entropy ≥ PRESTIGE_ENTROPY_BONUS_THRESHOLD` (Temporal Resonance, 0.70 threshold)

### Events (main clock only)

All events fire only for the main clock. Every event's negative component is scaled by `_entropyReduceFactor()`.

#### Fast Time (second ↔ minute hand overlap)

- **Buff**: 2× speed for 3 s. Gold glow + ⚡.
- **Debuff**: 0.5× speed. Red glow + 🔻. While Reverse Time active, debuff inverts to 2×.

Debuff chance = `(ENTROPY_DEBUFF_CHANCE_MIN + linear_ramp) × _entropyReduceFactor()`. At Entropy Shield Lv10: debuff chance = 0.

#### Time Fracture (minute ↔ hour hand overlap)

Same trigger as TimeDust. Only fires when `entropy ≥ FRACTURE_ENTROPY_THRESHOLD` (0.4).
TE loss = `baseLossRate × _entropyReduceFactor()`. At Entropy Shield Lv10: no fracture loss (flash also suppressed).

#### TimeDust (minute ↔ hour hand overlap)

Awards TD per overlap using the full TD yield formula (see Resources section above).

#### Temporal Surge

All three hands within `SURGE_THRESHOLD_DEG` (3°) of 12 o'clock. 5× speed + 3× TE for 30 s.

#### Reverse Time

Fires per forward revolution when `entropy ≥ REVERSE_ENTROPY_THRESHOLD` (0.6).
Chance = `(base_chance) × _entropyReduceFactor()`. Duration unchanged. At Entropy Shield Lv10: never fires.

### Prestige

**Cost:** 10 TD (`PRESTIGE_COST_TD`).

**PP gain:** `floor(TD × (1 + entropy × ppEntropyCoeff))` where `ppEntropyCoeff = 1 + prestigeAscendLevel × PRESTIGE_ASCEND_BOOST`. At Entropy Ascendance Lv10: coefficient = 2.0 (doubles the entropy bonus on PP).

Prestige resets: energy, speed/energy/clock/boost/stability levels, clock angles, extra clock bonuses, timeDust.

Prestige preserves: `prestigePoints`, `lifetimePPSpent`, all prestige upgrade levels.

`lifetimePPSpent` is only reset by full game reset, not by prestige.

#### Prestige Upgrades — Tier 1 (run boosters)

| Upgrade | Effect | Max |
|---|---|---|
| Boost Accelerate Time | Start each run with Accelerate Time +1 lv | — |
| Boost Improve Time | Start each run with Improve Time +1 lv | — |
| Boost Add Clock | Start each run with Add Clock +1 lv | `CLOCK_MAX_EXTRA` (3) |
| Boost Clocks | Start each run with Boost Clocks +1 lv | `BOOST_MAX_LEVEL` (20) |
| Boost Anchor Time | Start each run with Anchor Time +1 lv | — |

#### Prestige Upgrades — Tier 2 (new mechanics)

| Upgrade | Effect | Max | Start cost |
|---|---|---|---|
| Mirror Hands | Adds a backward-moving fractured hand to the main clock. **Doubles TE per revolution** (`mirrorMult = prestigeMirrorLevel ≥ 1 ? 2 : 1`). One-time purchase. | 1 | 15 PP |
| Extra TD | +20% TD yield per level (`PRESTIGE_TD_BONUS`) | — | 20 PP |
| Entropy Shield | All negative entropy effects × `_entropyReduceFactor()`; at Lv10 = zero | 10 | 20 PP |

#### Prestige Upgrades — Tier 3 (entropy as resource)

Active only when `entropy ≥ PRESTIGE_ENTROPY_BONUS_THRESHOLD` (0.70).

| Upgrade | Effect | Max | Start cost |
|---|---|---|---|
| Temporal Resonance | +`PRESTIGE_ENTROPY_TE_BONUS` (20%) TE per level (flat, above threshold) | 10 | 30 PP |
| Chaos Harvest | +`PRESTIGE_ENTROPY_TD_BONUS` (20%) TD per level (flat, above threshold) | 10 | 30 PP |
| Entropy Ascendance | PP entropy coefficient scales from 1.0 → 2.0 over 10 levels | 10 | 30 PP |

#### Prestige Upgrades — Tier 4

| Upgrade | Effect | Max | Cost |
|---|---|---|---|
| Temporal Singularity | At speed ≥ 1000× (100 000%), `getEntropy()` returns 1.0 exactly | 1 | 100 PP |

Buying any prestige upgrade increments `_lifetimePPSpent`, permanently increasing effective entropy.

### Snapshot fields (engine → store each frame)

`angle`, `energy`, `speedLevel`, `speedMultiplier`, `nextSpeedMultiplier`, `energyPerSecond`, `upgradeCost`, `energyLevel`, `energyPerRevolution`, `nextEnergyPerRevolution`, `energyUpgradeCost`, `clockCount`, `clockAtMax`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `boostLevel`, `boostAtMax`, `extraClockSpeedFactor`, `nextExtraClockSpeedFactor`, `extraAngles[]`, `extraRevolutions[]`, `clockUpgradeCost`, `boostUpgradeCost`, `isFastTime`, `fastTimeIsDebuff`, `fastTimeRemaining`, `isFracture`, `isSurge`, `surgeRemaining`, `isReverse`, `reverseTimeRemaining`, `totalRevolutions`, `timeDust`, `prestigePoints`, `lifetimePPSpent`, `canPrestige`, `entropy`, `nextEntropy`, `entropyTePenalty`, `stabilityLevel`, `stabilityUpgradeCost`, all prestige levels/costs/atMax flags for every upgrade in tiers 1–4

## Styling conventions

Tailwind for layout/spacing. Colors via CSS custom properties in `src/styles/index.css`:
- `--color-bg`: `#0a0a0f` (deep navy)
- `--color-accent`: `#7c6ff7` (purple)
- `--color-energy`: `#f0c060` (gold)
- `--color-surface`, `--color-border`, `--color-text`, `--color-muted`

All upgrade cards use teal (`#2a9d8f` / `#5ecfb0`) for borders, button gradients, level badges, and "Next" stat values.

`ExtraClock` uses teal (`#4dd0e1`) for the dot, trail, arm, and ambient glow.

Clock glow priority (highest → lowest): Fracture (red) → Reverse (red) → Surge (purple) → Fast Time buff (gold) / Fast Time debuff (red).

Avoid hardcoded Tailwind arbitrary values for theme colors — use CSS variables.

## Dev commands

```sh
npm run dev       # Vite dev server (hot reload)
npm run build     # Production build → dist/
npm run preview   # Serve the dist/ build locally
npm run lint      # ESLint
node simulate.mjs [hours=2] [strategy=greedy]   # headless progression simulator
```

## Key design principles

- **Simulation is framework-agnostic.** `GameEngine` has zero React imports.
- **One-way data flow.** Engine → store → components. Components never write to the engine except through store action functions.
- **Constants in one place.** All game-balance numbers live in `constants.js`. No magic numbers inline.
- **Delta-time everywhere.** All simulation uses elapsed milliseconds, never assumes a fixed frame rate.
- **Offline progress.** On load, engine credits energy for time away (capped at `MAX_OFFLINE_MS` = 4 h) using `getEnergyPerSecond()` without Fast Time.
- **Autosave.** Every `AUTOSAVE_INTERVAL_MS` (5 s) and on tab hide / unmount.
- **Transient state is not saved.** Fast Time, fracture flash, surge, reverse, clock angles, near-state arrays are always reset fresh on load.
- **Clicks only affect the main clock.** `addSecond()` passes `skipExtraClocks = true` to `_update()`.
- **`totalRevolutions` is main-clock-only.** Extra clock revolution counts live in `extraRevolutions[]`. This keeps minute/hour hand angles smooth.
- **Entropy reduce factor.** All negative entropy effects are multiplied by `_entropyReduceFactor()`, not hardcoded per-effect. Adding a new negative effect must use this factor.
