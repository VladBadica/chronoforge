# CLAUDE.md — ChronoForge

## What this is

ChronoForge is a browser-based idle/clicker game (also packaged as a desktop app via Electron). The player watches analog clocks spin; each full revolution of the main clock earns Time Energy (TE), which is spent on upgrades that make the clocks spin faster, earn more TE per revolution, or add more clocks. Clicking the clock area manually adds one second of game time to the main clock only. The game has an adversarial mechanic — Time Entropy — that grows with speed and introduces increasingly punishing events. A prestige system (spending Time Dust) resets each run but carries forward Prestige Points spent on permanent upgrades.

## Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| State | Zustand 5 |
| Styling | Tailwind CSS 4 (via `@tailwindcss/vite`) + CSS custom properties |
| Build | Vite 8 (browser) / electron-vite 5 (desktop) |
| Desktop | Electron 42 + electron-builder 26 |
| Lint | ESLint 10 with `eslint-plugin-react-hooks` and `eslint-plugin-react-refresh` |
| Persistence | `localStorage` (works natively in Electron's Chromium renderer) |

No TypeScript — the project is plain JavaScript (`.js`/`.jsx`).

**Peer dep note:** `electron-vite@5` declares `vite@^7` as a peer dep but the project uses Vite 8 (required by `@vitejs/plugin-react@6`). `.npmrc` sets `legacy-peer-deps=true` to suppress the conflict — do not remove it.

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

**Save encoding:** `save()` writes `btoa(JSON.stringify(data))` — base64-encoded so the save is not human-readable. `load()` tries `atob(raw)` first, falls back to plain JSON for saves written before encoding was added.

**Saved state fields** (persisted to `localStorage`):
`energy`, `speedLevel`, `energyLevel`, `clockCount`, `boostLevel`, `stabilityLevel`, `timeDust`, `totalRevolutions`, `extraRevolutions`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `prestigePoints`, `lifetimePPSpent`, all prestige upgrade levels (`prestigeSpeedLevel`, `prestigeEnergyLevel`, `prestigeClockLevel`, `prestigeBoostLevel`, `prestigeAnchorLevel`, `prestigeMirrorLevel`, `prestigeTdLevel`, `prestigeEntropyReduceLevel`, `prestigeEntropyTeLevel`, `prestigeEntropyTdLevel`, `prestigeAscendLevel`, `prestigeSingularityLevel`), `singularities`, `totalClicks`, `timesPrestiged`, `totalPPEarned`, `maxSpeedReached`, `timesAscended`, `savedAt`

**Transient state** (not saved, reset on load):
`_fastTimeRemaining`, `_fastTimeIsDebuff`, `_fractureFlash`, `_surgeRemaining`, `_reverseTimeRemaining`, `_extraAngles`, `_extraClockRunning`, `_ascendUnlocked`, `_prevNear`, `_prevHourMinNear`, `_prevSurgeNear`

**`_update(deltaMs, skipExtraClocks = false, silent = false)`** — core loop step. `skipExtraClocks = true` means extra clocks don't advance (used by `addSecond()`). `silent = true` skips `_emitSnapshot()` — used for intermediate sub-steps inside `addSecond()`.

**`addSecond()`** — simulates 1 second of game time by breaking it into sub-steps. Step size = `FAST_TIME_THRESHOLD_DEG / degreesPerMs` (min 1 ms) so the second hand can never skip over a 5° event window in a single step, regardless of speed. Only the final sub-step emits a snapshot. Increments `_totalClicks`.

**`getTotalMaintenanceCost()`** — sum of `_getExtraClockMaintenanceCost(i)` for all running extra clocks. Subtracted from gross TE/s in the snapshot so `energyPerSecond` is always the **net** rate.

**`canAscend()`** — checks `_prestigeSingularityLevel ≥ 1`, entropy = 1.0, and effective speed (base × fastMult × surgeMult) ≥ `ASCEND_SPEED_THRESHOLD`. Latches `_ascendUnlocked = true` the first time it fires so the Ascend button stays visible for the rest of the run even if buffs expire.

**`ascend()`** — grants `getSingularityGain()` singularities, then performs a full reset of both run state and prestige layer (PP, PP spent, all prestige levels). Singularities and lifetime stats are never reset by ascend.

**`getEntropyTeMultiplier()`** — combined TE multiplier for each revolution: `max(0, 1 − getEntropyTePenalty() + entropy × prestigeEntropyTeLevel × PRESTIGE_ENTROPY_TE_BONUS)`. Can exceed 1.0 when Temporal Resonance is active at high entropy. Used everywhere `(1 − tePenalty)` was previously used.

**`_entropyReduceFactor()`** — returns `1 − prestigeEntropyReduceLevel / PRESTIGE_ENTROPY_REDUCE_MAX`. Multiplied into every negative entropy effect (TE penalty, debuff chance, fracture loss, reverse time chance). At Entropy Shield Lv10 = 0 (all negative effects suppressed).

### `src/store/useGameStore.js`

The Zustand bridge. Registers a tick callback at module load time; every frame the engine pushes a snapshot and the store updates React state. Actions (`buyUpgrade`, `addSecond`, etc.) call engine methods directly — the next snapshot propagates results back.

### `src/hooks/useGameEngine.js`

A single `useEffect` that mounts/unmounts the engine: loads save, starts the RAF loop, wires `visibilitychange` to pause when the tab is hidden (offline progress credited on resume).

### `src/game/constants.js`

All tunable game-balance values. Never put magic numbers inline — change here. Sections: Core / Upgrades / Entropy / Events / Prestige (Tier 1–4) / Reverse Time / System.

### `src/utils/format.js`

Shared number formatter using `decimal.js` (display-only — game internals use plain JS numbers). `fmt(n, decimals = 2)` produces suffix notation (K, M, B, T, Qa, Qi, Sx, Sp, Oc, No, Dc) up to 10^33, then scientific notation. Import this everywhere numbers are displayed; do not define local `formatNumber` helpers.

### Components (`src/components/`)

All purely presentational — receive props, render, no game state, no engine calls.

- **`Clock.jsx`** — SVG analog clock, three hands (no tail — hands start at centre), tick marks, glow. Receives `angle` (0–360°), `totalRevolutions`, `entropy` (0–1), `showMirror`, and `suppressWarp`. Mirror hand (when `showMirror`) is fractured at two points. **Turbulence warp**: above `WARP_THRESHOLD` (0.40 entropy) an `feTurbulence + feDisplacementMap` SVG filter warps the clock. Suppressed entirely when `suppressWarp = true` (set when Temporal Stabilization is purchased).
- **`ExtraClock.jsx`** — Minimal orbiting-dot display for extra clocks. Receives `angle`, `size`, `running` (bool), `maintenanceCost`, and `onClick`. Dims and shows a pause icon when stopped; displays drain rate in red when running and cost > 0.
- **`EnergyDisplay.jsx`** — Shows TE, net TE/s (after maintenance), and TimeDust count.
- **`UpgradePanel.jsx`** — Five upgrade cards in a **single-column** list (no heading — heading lives in App.jsx LHS).
- **`StatsBar.jsx`** — Top bar: total revolutions and current speed %. Shows gold ⚡ for Fast Time buff, red 🔻 for Fast Time debuff, with matching border/shadow colors.
- **`PrestigeModal.jsx`** — Modal (`max-w-2xl`) for prestiging and spending PP on prestige upgrades across four tiers. Upgrade list is independently scrollable (`custom-scrollbar`, `max-h: 40vh`). Stays open after prestiging.
- **`AscendModal.jsx`** — Gold-themed modal shown when `canAscend` is true. Displays entropy → singularity gain conversion. Ascending resets everything including the prestige layer.
- **`SettingsModal.jsx`** — Opened by the cogwheel button (top-right of LHS "Upgrades" heading). Fixed `80vh` height, two tabs: **Stats** (in-game time, speeds, lifetime stats) and **Options** (Save Game with inline confirmation feedback, Exit in Electron). Clicking the Singularities row 5 times unlocks the debug buttons in the LHS (in-memory only, not saved).

**Layout:** 30/70 CSS grid split (`app-grid` class in `index.css`; switches to 20/80 at ≥ 1500 px). LHS: upgrades heading + cogwheel, `UpgradePanel`, prestige/ascend buttons, debug buttons (hidden until unlocked). RHS: header, stats bar, entropy bar, clocks, energy display. Modal-layer components (Prestige, Ascend, Settings) are rendered inside the root grid div and use `position: fixed`.

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

**Clicking an extra clock toggles it on/off.** A stopped clock does not spin, does not accumulate bonus, and pays no maintenance.

| Clock | Base speed | Effect per revolution | Maintenance cost |
|---|---|---|---|
| Clock 2 | 0.10× main | +`CLOCK2_SPEED_BONUS` (0.02) additive speed bonus | `clock2SpeedBonus × CLOCK2_MAINTENANCE_RATE` TE/s |
| Clock 3 | 0.05× main | +`CLOCK3_TE_BONUS` (2) TE/rev | `clock3TeBonus × CLOCK3_MAINTENANCE_RATE` TE/s |
| Clock 4 | 0.001× main | −`CLOCK4_ENTROPY_REDUCTION` (1%) raw entropy | `clock4EntropyReduction × CLOCK4_MAINTENANCE_RATE` TE/s |

**Maintenance drain:** Every frame a running extra clock deducts TE proportional to its accumulated bonus. If energy hits 0 the clock auto-stops. Rate constants (`CLOCK2_MAINTENANCE_RATE = 0.5`, `CLOCK3_MAINTENANCE_RATE = 0.2`, `CLOCK4_MAINTENANCE_RATE = 5`) live in `constants.js`.

Running state (`_extraClockRunning[]`) is **transient** — not saved. It resets to all-`true` on prestige/reset and on first load (when no in-memory state exists or the clock count changed); a mid-session `load()` (e.g. visibility-change resume crediting offline progress) preserves the player's current pause toggles instead of clobbering them.

All extra clock speeds are scaled by the boost ratio: `speed = BASE_SPEED × (getExtraClockSpeedFactor() / CLOCK_SPEED_FACTOR)`.

`totalRevolutions` in the snapshot counts **main clock only**.

### Time Entropy

**Raw entropy:** `rawEntropy = max(0, (speedMult − 1) / (speedMult − 1 + stability) − clock4EntropyReduction)`

**Effective entropy (used everywhere):** `1 − (1 − raw)^(1 + lifetimePPSpent × K)`

**Temporal Stabilization override:** if `_prestigeSingularityLevel > 0` and `speedMult ≥ PRESTIGE_SINGULARITY_SPEED_THRESHOLD` (100×), `getEntropy()` returns `1.0` exactly, bypassing the formula. Also suppresses the clock turbulence warp (`suppressWarp` prop on Clock).

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

All three hands within `SURGE_THRESHOLD_DEG` (3°) of 12 o'clock. 5× speed + 3× TE for 30 s. The timer is reset to `SURGE_DURATION_MS` on every tick the hands are aligned (not just the rising edge), so a second alignment while a surge is active always resets to the full duration.

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
| Boost Add Clock | Start each run with Add Clock +1 lv. **Refundable** — `refundPrestigeClock()` refunds the last level's PP cost and immediately removes one clock from the current run. | `CLOCK_MAX_EXTRA` (3) |
| Boost Clocks | Start each run with Boost Clocks +1 lv | `BOOST_MAX_LEVEL` (20) |
| Boost Anchor Time | Start each run with Anchor Time +1 lv. **Refundable** — `refundPrestigeAnchor()` refunds the last level's PP cost and immediately decrements `_stabilityLevel` in the current run. | — |

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
| Temporal Stabilization | At speed ≥ 100× (10 000%), `getEntropy()` returns 1.0 exactly; suppresses clock warp | 1 | 100 PP |

Buying any prestige upgrade increments `_lifetimePPSpent`, permanently increasing effective entropy.

### Ascension

**Conditions (all must be true; latches once met):**
- Temporal Stabilization purchased (`_prestigeSingularityLevel ≥ 1`)
- `getEntropy() = 1.0` (100%)
- Effective speed (base × fastTimeMult × surgeMult) ≥ `ASCEND_SPEED_THRESHOLD` (1000×)

Once all three conditions are met, `_ascendUnlocked` is set to `true` for the rest of the run regardless of whether Fast Time or Surge expire. The gold Ascend button appears in the LHS below Prestige.

**Singularity gain:** `Math.floor(entropy) × ASCEND_SINGULARITY_PER_ENTROPY` — currently always 1 per ascension (entropy is capped at 1.0).

**Ascend resets:** everything prestige resets, PLUS all prestige points, lifetimePPSpent, and all prestige upgrade levels.

**Ascend preserves:** `_singularities`, all lifetime stats (`_totalClicks`, `_timesPrestiged`, `_totalPPEarned`, `_maxSpeedReached`, `_timesAscended`).

### Lifetime stats

Tracked in the engine, saved, only reset by full game reset:

| Field | Incremented by |
|---|---|
| `_totalClicks` | Each `addSecond()` call |
| `_timesPrestiged` | Each `prestige()` |
| `_totalPPEarned` | PP gained per prestige (added alongside `_prestigePoints`) |
| `_maxSpeedReached` | Every `_update()` frame — tracks max of `speedMult` (including fast/surge) |
| `_timesAscended` | Each `ascend()` |

**Refunds (Boost Add Clock and Boost Anchor Time only):** `_refundPrestigeUpgrade(levelProp, base, scaling, onRefund)` decrements the level, credits the exact PP cost of that level back to `prestigePoints`, and calls `onRefund` to apply the change to the current run immediately. `_lifetimePPSpent` is **not** reduced — the entropy cost is permanent.

### Snapshot fields (engine → store each frame)

`angle`, `energy`, `speedLevel`, `speedMultiplier`, `nextSpeedMultiplier`, `energyPerSecond` (net, after maintenance), `upgradeCost`, `energyLevel`, `energyPerRevolution`, `nextEnergyPerRevolution`, `energyUpgradeCost`, `clockCount`, `clockAtMax`, `clock2SpeedBonus`, `clock3TeBonus`, `clock4EntropyReduction`, `boostLevel`, `boostAtMax`, `extraClockSpeedFactor`, `nextExtraClockSpeedFactor`, `extraAngles[]`, `extraRevolutions[]`, `extraClockRunning[]`, `extraClockMaintenanceCosts[]`, `clockUpgradeCost`, `boostUpgradeCost`, `isFastTime`, `fastTimeIsDebuff`, `fastTimeRemaining`, `isFracture`, `isSurge`, `surgeRemaining`, `isReverse`, `reverseTimeRemaining`, `totalRevolutions`, `timeDust`, `singularities`, `singularityGain`, `canAscend`, `totalClicks`, `timesPrestiged`, `totalPPEarned`, `maxSpeedReached`, `timesAscended`, `prestigePoints`, `lifetimePPSpent`, `canPrestige`, `entropy`, `nextEntropy`, `entropyTePenalty`, `stabilityLevel`, `stabilityUpgradeCost`, `prestigeClockRefund`, `prestigeAnchorRefund`, all prestige levels/costs/atMax flags for every upgrade in tiers 1–4

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
# Browser workflow (fastest iteration)
npm run dev       # Vite dev server with hot reload
npm run build     # Production build → dist/
npm run preview   # Serve dist/ locally
npm run lint      # ESLint

# Electron workflow
npm run electron:dev    # Launch app in Electron with hot reload
npm run electron:build  # Compile only → out/  (main + preload + renderer)
npm run dist            # Compile + package installers → release/

node simulate.mjs [hours=2] [strategy=greedy]   # headless progression simulator
```

## Electron structure

```
electron/
  main/
    index.js      ← Electron main process (BrowserWindow, menu suppression)
  preload/
    index.js      ← contextBridge (exposes `platform` and `quit`; save uses localStorage)
electron.vite.config.js   ← electron-vite config; renderer root set to '.' (project root)
```

Build output layout:
```
out/
  main/index.js         ← built main process (CJS)
  preload/index.mjs     ← built preload (ESM)
  renderer/             ← built React app (index.html + assets)
release/                ← electron-builder installers (created by npm run dist)
```

`"main": "out/main/index.js"` in `package.json` is the Electron entry point.

The preload path in `electron/main/index.js` references `../preload/index.mjs` — must match the `.mjs` extension that electron-vite outputs for the preload lib build.

**Electron binary install issue (Windows):** `npm install` sometimes downloads the zip but silently fails to extract it, leaving `node_modules/electron/dist/` incomplete and `path.txt` missing. Fix with PowerShell:
```powershell
$zip = Get-ChildItem "$env:LOCALAPPDATA\electron\Cache\*\electron-v42.3.3-win32-x64.zip" | Select-Object -First 1
Remove-Item -Recurse -Force .\node_modules\electron\dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force .\node_modules\electron\dist | Out-Null
Expand-Archive -Path $zip.FullName -DestinationPath .\node_modules\electron\dist -Force
"electron.exe" | Set-Content .\node_modules\electron\path.txt -NoNewline
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
- **Net TE/s.** `energyPerSecond` in the snapshot is gross income minus `getTotalMaintenanceCost()`. Offline progress uses raw `getEnergyPerSecond()` (no maintenance — clocks are transient).
- **Number formatting.** Always use `fmt()` from `src/utils/format.js`. Never define local `formatNumber` helpers in components.
- **Tailwind spacing utilities are unreliable.** Use inline `style` props or named CSS classes (`index.css`) for layout-critical padding/margin. Tailwind v4 generates classes on-demand and spacing may not be generated in dev mode.
