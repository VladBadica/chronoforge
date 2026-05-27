# CLAUDE.md — ChronoForge

## What this is

ChronoForge is a browser-based idle/clicker game. The player watches analog clocks spin; each full revolution of the main clock earns Time Energy (TE), which is spent on upgrades that make the clocks spin faster, earn more TE per revolution, or add more clocks. Clicking the clock area manually adds one second of game time to the main clock only. The game has an adversarial mechanic — Time Entropy — that grows with speed and introduces increasingly punishing events.

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
`energy`, `speedLevel`, `energyLevel`, `clockCount`, `boostLevel`, `stabilityLevel`, `timeDust`, `totalRevolutions`, `extraRevolutions`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `prestigePoints`, `lifetimePPSpent`, prestige upgrade levels, `savedAt`

**Transient state** (not saved, reset to 0 on load):
`_fastTimeRemaining`, `_fastTimeIsDebuff`, `_fractureFlash`, `_surgeRemaining`, `_reverseTimeRemaining`, `_extraAngles`, `_prevNear`, `_prevHourMinNear`, `_prevSurgeNear`

**`_update(deltaMs, skipExtraClocks = false)`** — core loop step. Pass `skipExtraClocks = true` from `addSecond()` so manual clicks only advance the main clock.

### `src/store/useGameStore.js`

The Zustand bridge. Registers a tick callback at module load time; every frame the engine pushes a snapshot and the store updates React state. Actions (`buyUpgrade`, `addSecond`, etc.) call engine methods directly — the next snapshot propagates results back.

### `src/hooks/useGameEngine.js`

A single `useEffect` that mounts/unmounts the engine: loads save, starts the RAF loop, wires `visibilitychange` to pause when the tab is hidden (offline progress credited on resume).

### `src/game/constants.js`

All tunable game-balance values. Never put magic numbers inline — change here. Sections: Core / Upgrades / Entropy / Events / Prestige / Reverse Time / System.

### Components (`src/components/`)

All purely presentational — receive props, render, no game state, no engine calls.

- **`Clock.jsx`** — SVG analog clock, three hands, tick marks, glow. Receives `angle` (0–360°) and `totalRevolutions`; derives minute/hour hand angles as `(totalRevolutions + angle/360) * multiplier` — no modulo, so angles accumulate continuously and never jump.
- **`EnergyDisplay.jsx`** — Shows TE, TE/s rate, and TimeDust count.
- **`UpgradePanel.jsx`** — Five upgrade cards in a 2-column grid (Anchor Time spans full width).
- **`StatsBar.jsx`** — Top bar: total revolutions and current speed %. Shows gold ⚡ for Fast Time buff, red 🔻 for Fast Time debuff, with matching border/shadow colors.
- **`PrestigeModal.jsx`** — Modal for prestiging and spending Prestige Points on prestige upgrades. Stays open after prestiging so the player can spend PP immediately.

## Game mechanics

### Resources

- **Time Energy (TE)** — primary currency; earned every main clock revolution only.
- **Time Dust (TD)** — rare resource; earned when minute and hour hands overlap on the main clock (~every 720 rev-equivalents).

### Upgrades (all in `UpgradePanel`)

| Upgrade | Effect | Key constants |
|---|---|---|
| Accelerate Time | Increases main clock speed multiplier | `UPGRADE_BASE_COST`, `UPGRADE_COST_EXPONENT`, `UPGRADE_SPEED_BONUS`, `UPGRADE_SPEED_BONUS_SCALING` |
| Improve Time | Increases TE per revolution | `ENERGY_UPGRADE_BASE_COST`, `ENERGY_UPGRADE_COST_EXPONENT`, `ENERGY_UPGRADE_VALUE_BONUS`, `ENERGY_UPGRADE_VALUE_SCALING` |
| Add Clock | Adds an extra clock (max 3 extra) | `CLOCK_UPGRADE_BASE_COST`, `CLOCK_UPGRADE_COST_EXPONENT`, `CLOCK_MAX_EXTRA` |
| Boost Clocks | Increases base speed factor for all extra clocks | `BOOST_UPGRADE_BASE_COST`, `BOOST_UPGRADE_COST_EXPONENT`, `BOOST_MAX_LEVEL` |
| Anchor Time | Reduces Time Entropy by increasing stability | `STABILITY_UPGRADE_BASE_COST`, `STABILITY_UPGRADE_COST_EXPONENT`, `ENTROPY_BASE_STABILITY`, `ENTROPY_STABILITY_SCALING` |

### Extra clocks

Up to 3 extra clocks. Each has a fixed base speed and a unique permanent effect that accumulates on every revolution of that clock. Extra clocks do **not** generate TE or TD and are **not** affected by manual clicks.

| Clock | Base speed | Effect per revolution |
|---|---|---|
| Clock 2 | 0.10× main | +`CLOCK2_SPEED_BONUS` (0.10) additive speed bonus |
| Clock 3 | 0.05× main | +`CLOCK3_TE_BONUS` (1) TE/rev |
| Clock 4 | 0.01× main | −`CLOCK4_ENTROPY_REDUCTION` (1%) raw entropy |

All extra clock speeds are scaled by the boost ratio: `speed = BASE_SPEED * (getExtraClockSpeedFactor() / CLOCK_SPEED_FACTOR)`.

`totalRevolutions` in the snapshot counts **main clock only**. Extra clock revolution counts are in `extraRevolutions[]`.

### Time Entropy

**Raw entropy:** `rawEntropy = max(0, (speedMult - 1) / (speedMult - 1 + stability) - clock4EntropyReduction)`

**Effective entropy (used everywhere):** `1 - (1 - rawEntropy)^(1 + lifetimePPSpent × K)`

- Always 0 at base speed. Approaches 1 asymptotically as speed grows.
- `stability = ENTROPY_BASE_STABILITY * ENTROPY_STABILITY_SCALING^stabilityLevel`
- Lifetime PP spent (`_lifetimePPSpent`) amplifies entropy permanently and is never reset by prestige — only by full reset.
- `K = PRESTIGE_ENTROPY_PP_SCALING` (0.01). Formula stays naturally in [0, 1].
- Displayed as a color-coded bar (green → orange → red).

**TE penalty:** Linear from −5% at 40% entropy to −25% at 100% entropy. Applied to every main clock revolution.

### Events (main clock only)

All three events fire only for the main clock. Extra clocks do not trigger any events.

#### Fast Time (second ↔ minute hand overlap)

Fires on rising edge when hands come within `FAST_TIME_THRESHOLD_DEG` degrees.

- **Buff** (normal): `FAST_TIME_MULTIPLIER` (2×) speed for `FAST_TIME_DURATION_MS` (3 s). Gold glow + ⚡.
- **Debuff** (entropy-corrupted): `FAST_TIME_DEBUFF_MULTIPLIER` (0.5×) speed. Red glow + 🔻.
- While the **Reverse Time** mechanic is active, the debuff inverts to a speed-up (2×) instead of a slowdown.

Debuff chance is linear from `ENTROPY_DEBUFF_CHANCE_MIN` (10%) at `ENTROPY_DEBUFF_THRESHOLD` (40%) to `ENTROPY_DEBUFF_CHANCE_MAX` (70%) at entropy 1.0.

#### Time Fracture (minute ↔ hour hand overlap)

Fires simultaneously with the TimeDust award on the same hand overlap.

- Only triggers when `entropy >= FRACTURE_ENTROPY_THRESHOLD` (0.4).
- TE loss: 10% at threshold → 40% at entropy 1.0 (linear).
- Sets `_fractureFlash` → `isFracture` in snapshot → intense red clock glow (highest glow priority).

#### TimeDust (minute ↔ hour hand overlap)

Same trigger as Time Fracture. Awards `TIMEDUST_BASE_YIELD` (1) TD per overlap.

#### Temporal Surge (all three hands near 12 o'clock)

Fires when all three hands are within `SURGE_THRESHOLD_DEG` (3°) of 12 o'clock simultaneously. Deterministic — 100% chance when condition is met.

- `SURGE_SPEED_MULTIPLIER` (5×) speed and `SURGE_ENERGY_MULTIPLIER` (3×) TE for `SURGE_DURATION_MS` (30 s).

#### Reverse Time

Fires with a chance on each completed forward revolution when entropy ≥ `REVERSE_ENTROPY_THRESHOLD` (0.6).

- Chance: linear from `REVERSE_CHANCE_AT_THRESHOLD` (10%) at 60% to `REVERSE_CHANCE_AT_MAX` (15%) at 100%.
- Duration: linear from `REVERSE_DURATION_AT_THRESHOLD` (2 s) at 60% to `REVERSE_DURATION_AT_MAX` (5 s) at 100%.
- While active: main clock ticks backwards, completed reverse revolutions subtract TE (clamped to 0). Event checks are suppressed.
- Reverse cannot chain into another reverse.
- Visual: cyan glow (lower priority than Fracture).

### Prestige

**Cost:** 10 TD (`PRESTIGE_COST_TD`).

**PP gain:** `floor(TD * (1 + entropy))` — entropy amplifies the reward.

Prestige resets: energy, speed/energy/clock/boost/stability levels, clock angles, extra clock bonuses (`clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`), timeDust.

Prestige preserves: `prestigePoints`, `lifetimePPSpent`, all prestige upgrade levels.

`lifetimePPSpent` is only reset by full game reset, not by prestige.

#### Prestige Upgrades

| Upgrade | Effect | Max |
|---|---|---|
| Boost Accelerate Time | Start each run with Accelerate Time +1 lv | — |
| Boost Improve Time | Start each run with Improve Time +1 lv | — |
| Boost Add Clock | Start each run with Add Clock +1 lv | `CLOCK_MAX_EXTRA` (3) |
| Boost Clocks | Start each run with Boost Clocks +1 lv | `BOOST_MAX_LEVEL` (20) |
| Boost Anchor Time | Start each run with Anchor Time +1 lv | — |
| Mirror Clocks | Adds a backward-moving hand (+1 clock per level) | `CLOCK_MAX_EXTRA` (3) |

Buying any prestige upgrade increments `_lifetimePPSpent`, permanently increasing effective entropy.

### Snapshot fields (engine → store each frame)

`angle`, `energy`, `speedLevel`, `speedMultiplier`, `nextSpeedMultiplier`, `energyPerSecond`, `upgradeCost`, `energyLevel`, `energyPerRevolution`, `nextEnergyPerRevolution`, `energyUpgradeCost`, `clockCount`, `clockAtMax`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `boostLevel`, `boostAtMax`, `extraClockSpeedFactor`, `nextExtraClockSpeedFactor`, `extraAngles[]`, `extraRevolutions[]`, `clockUpgradeCost`, `boostUpgradeCost`, `isFastTime`, `fastTimeIsDebuff`, `fastTimeRemaining`, `isFracture`, `isSurge`, `surgeRemaining`, `isReverse`, `reverseTimeRemaining`, `totalRevolutions`, `timeDust`, `prestigePoints`, `lifetimePPSpent`, `canPrestige`, `entropy`, `nextEntropy`, `entropyTePenalty`, `stabilityLevel`, `stabilityUpgradeCost`, prestige levels/costs/atMax flags

## Styling conventions

Tailwind for layout/spacing. Colors via CSS custom properties in `src/styles/index.css`:
- `--color-bg`: `#0a0a0f` (deep navy)
- `--color-accent`: `#7c6ff7` (purple)
- `--color-energy`: `#f0c060` (gold)
- `--color-surface`, `--color-border`, `--color-text`, `--color-muted`

All upgrade cards use teal (`#2a9d8f` / `#5ecfb0`) for borders, button gradients, level badges, and "Next" stat values.

Clock glow priority (highest → lowest): Fracture (red) → Reverse (red) → Surge (purple) → Fast Time buff (gold) / Fast Time debuff (red).

Avoid hardcoded Tailwind arbitrary values for theme colors — use CSS variables.

## Dev commands

```sh
npm run dev       # Vite dev server (hot reload)
npm run build     # Production build → dist/
npm run preview   # Serve the dist/ build locally
npm run lint      # ESLint
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
