# CLAUDE.md — ChronoForge

## What this is

ChronoForge is a browser-based idle/clicker game. The player watches analog clocks spin; each full revolution earns Time Energy (TE), which is spent on upgrades that make the clocks spin faster, earn more per revolution, or add more clocks. Clicking the clock area manually adds one second of game time. The game has an adversarial mechanic — Time Entropy — that grows with speed and introduces punishing events.

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
`energy`, `speedLevel`, `energyLevel`, `clockCount`, `boostLevel`, `stabilityLevel`, `timeDust`, `totalRevolutions`, `extraRevolutions`, `savedAt`

**Transient state** (not saved, reset to 0 on load):
`_fastTimeRemaining`, `_fastTimeIsDebuff`, `_fractureFlash`, `_extraAngles`, `_prevNear`, `_prevHourMinNear`

### `src/store/useGameStore.js`

The Zustand bridge. Registers a tick callback at module load time; every frame the engine pushes a snapshot and the store updates React state. Actions (`buyUpgrade`, `addSecond`, etc.) call engine methods directly — the next snapshot propagates results back.

### `src/hooks/useGameEngine.js`

A single `useEffect` that mounts/unmounts the engine: loads save, starts the RAF loop, wires `visibilitychange` to pause when the tab is hidden (offline progress credited on resume).

### `src/game/constants.js`

All tunable game-balance values. Never put magic numbers inline — change here.

### Components (`src/components/`)

All purely presentational — receive props, render, no game state, no engine calls.

- **`Clock.jsx`** — SVG analog clock, three hands, tick marks, glow. Receives `angle` (0–360°) and `totalRevolutions`; derives minute/hour hand angles from those.
- **`EnergyDisplay.jsx`** — Shows TE, TE/s rate, and TimeDust count.
- **`UpgradePanel.jsx`** — Five upgrade cards in a 2-column grid (Anchor Time spans full width).
- **`StatsBar.jsx`** — Top bar: total revolutions and current speed %. Shows gold ⚡ for Fast Time buff, red 🔻 for Fast Time debuff, with matching border/shadow colors.

## Game mechanics

### Resources

- **Time Energy (TE)** — primary currency; earned every revolution on every clock.
- **Time Dust (TD)** — rare resource; earned when minute and hour hands overlap on any clock (~every 65 rev-equivalents). Extra clocks earn `CLOCK_YIELD_MULTIPLIER^(clockIndex)` TD per overlap.

### Upgrades (all in `UpgradePanel`)

| Upgrade | Effect | Key constants |
|---|---|---|
| Accelerate Time | Increases main clock speed multiplier | `UPGRADE_BASE_COST`, `UPGRADE_COST_EXPONENT`, `UPGRADE_SPEED_BONUS`, `UPGRADE_SPEED_BONUS_SCALING` |
| Improve Time | Increases TE per revolution | `ENERGY_UPGRADE_BASE_COST`, `ENERGY_UPGRADE_COST_EXPONENT`, `ENERGY_UPGRADE_VALUE_BONUS`, `ENERGY_UPGRADE_VALUE_SCALING` |
| Add Clock | Adds an extra clock at 10% of main speed | `CLOCK_UPGRADE_BASE_COST`, `CLOCK_UPGRADE_COST_EXPONENT`, `CLOCK_SPEED_FACTOR` |
| Boost Clocks | Increases base speed factor for all extra clocks | `BOOST_UPGRADE_BASE_COST`, `BOOST_UPGRADE_COST_EXPONENT`, `BOOST_SPEED_BONUS`, `BOOST_SPEED_BONUS_SCALING` |
| Anchor Time | Reduces Time Entropy by increasing stability | `STABILITY_UPGRADE_BASE_COST`, `STABILITY_UPGRADE_COST_EXPONENT`, `ENTROPY_BASE_STABILITY`, `ENTROPY_STABILITY_SCALING` |

### Extra clock yield scaling

Clock 1 (main): 1× TE/TD. Clock 2: `CLOCK_YIELD_MULTIPLIER`×. Clock 3: `CLOCK_YIELD_MULTIPLIER²`×. Etc. Extra clock `i` (0-indexed) runs at `getExtraClockSpeedFactor() * CLOCK_SPEED_FACTOR^i` of the main clock's speed.

`getEnergyPerSecond(includeFastTime?)` sums contributions from all clocks. The `includeFastTime` flag is `true` in snapshots (display) and omitted/`false` for offline progress calculation.

### Time Entropy

`entropy = (speedMultiplier - 1) / (speedMultiplier - 1 + stability)`

- Always 0 at base speed (1×, no upgrades). Approaches 1 asymptotically as speed grows.
- `stability = ENTROPY_BASE_STABILITY * ENTROPY_STABILITY_SCALING^stabilityLevel`
- Displayed as a color-coded bar (green → orange → red) using a dynamic `background-size` trick so the bar's left edge always shows the correct color zone of the full gradient.
- Entropy currently affects two events (see below). No direct income penalty yet.

### Fast Time (second ↔ minute hand overlap)

Fires on rising edge when the second and minute hands come within `FAST_TIME_THRESHOLD_DEG` degrees.

- **Buff** (normal): `FAST_TIME_MULTIPLIER` (1.5×) speed for `FAST_TIME_DURATION_MS`. Gold glow + ⚡.
- **Debuff** (entropy-corrupted): `FAST_TIME_DEBUFF_MULTIPLIER` (0.5×) speed. Red glow + 🔻.

Debuff chance is linear from `ENTROPY_DEBUFF_CHANCE_MIN` (10%) at `ENTROPY_DEBUFF_THRESHOLD` (40%) to `ENTROPY_DEBUFF_CHANCE_MAX` (70%) at entropy 1.0. Zero chance below 40% entropy.

### Time Fracture (minute ↔ hour hand overlap)

Fires on rising edge of the same event that also awards TimeDust.

- Only triggers when `entropy >= FRACTURE_ENTROPY_THRESHOLD` (0.4).
- TE loss scales linearly: 10% at entropy 0.4 → 40% at entropy 1.0.
  Formula: `lossRate = FRACTURE_LOSS_AT_THRESHOLD + t * (FRACTURE_LOSS_AT_MAX - FRACTURE_LOSS_AT_THRESHOLD)` where `t = (entropy - threshold) / (1 - threshold)`.
- Fires per-clock — each clock's minute/hour overlap is checked independently.
- Sets `_fractureFlash` for `FRACTURE_FLASH_MS` (2 s) → `isFracture` in snapshot → intense red clock glow in UI (overrides Fast Time glow).

### Snapshot fields (engine → store each frame)

`angle`, `energy`, `speedLevel`, `speedMultiplier`, `nextSpeedMultiplier`, `energyPerSecond`, `upgradeCost`, `energyLevel`, `energyPerRevolution`, `nextEnergyPerRevolution`, `energyUpgradeCost`, `clockCount`, `boostLevel`, `extraClockSpeedFactor`, `nextExtraClockSpeedFactor`, `extraAngles[]`, `extraRevolutions[]`, `clockUpgradeCost`, `boostUpgradeCost`, `isFastTime`, `fastTimeIsDebuff`, `fastTimeRemaining`, `totalRevolutions`, `timeDust`, `entropy`, `nextEntropy`, `stabilityLevel`, `stabilityUpgradeCost`, `isFracture`

## Styling conventions

Tailwind for layout/spacing. Colors via CSS custom properties in `src/styles/index.css`:
- `--color-bg`: `#0a0a0f` (deep navy)
- `--color-accent`: `#7c6ff7` (purple)
- `--color-energy`: `#f0c060` (gold)
- `--color-surface`, `--color-border`, `--color-text`, `--color-muted`

All upgrade cards use teal (`#2a9d8f` / `#5ecfb0`) for borders, button gradients, level badges, and "Next" stat values — uniform across all five cards.

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
- **Transient state is not saved.** Fast Time, fracture flash, clock angles, near-state arrays are always reset fresh on load.
