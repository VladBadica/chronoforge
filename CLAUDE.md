# CLAUDE.md — ChronoForge

## What this is

ChronoForge is a browser-based idle/clicker game. The player watches an analog clock spin; each full revolution earns Time Energy, which can be spent on "Accelerate Time" upgrades that make the clock spin faster, compounding earnings. Clicking the clock manually adds one second of game time.

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

The codebase has a strict three-layer separation:

```
GameEngine (pure simulation)
    ↓  emitSnapshot() each frame
useGameStore (Zustand bridge)
    ↓  reactive state
React components (pure rendering)
```

### `src/game/GameEngine.js`

A vanilla JS class that owns all simulation state (`_angle`, `_energy`, `_speedLevel`, `_totalRevolutions`). It runs a `requestAnimationFrame` loop and drives everything with delta-time so results are identical at any frame rate. React never touches this class directly — it communicates only through callbacks.

The singleton `gameEngine` is exported and used everywhere.

### `src/store/useGameStore.js`

The Zustand store is the bridge. It registers a tick callback with the engine at module load time; every frame the engine pushes a snapshot and the store updates React state. Actions (`buyUpgrade`, `addSecond`) call engine methods directly — the next snapshot propagates the result back.

### `src/hooks/useGameEngine.js`

A single `useEffect` hook that mounts/unmounts the engine alongside the component tree: loads the save, starts the RAF loop, and wires `visibilitychange` so the loop pauses when the tab is hidden (offline progress is credited on resume via `GameEngine.load()`).

### `src/game/constants.js`

All tunable game-balance values live here. Change numbers here, not inline.

### Components (`src/components/`)

All components are purely presentational — they receive props and render. None of them hold game state or call engine methods directly.

- **`Clock.jsx`** — SVG analog clock, three hands, tick marks, glow effects. Receives `angle` (0–360°) and `totalRevolutions`; derives minute/hour hand angles from those.
- **`EnergyDisplay.jsx`** — Shows current energy and energy-per-second rate.
- **`UpgradePanel.jsx`** — "Accelerate Time" upgrade button with cost and level display.
- **`StatsBar.jsx`** — Top bar showing total revolutions and speed multiplier.

### Styling

Tailwind utility classes for layout/spacing. Colors and theme values use CSS custom properties defined in `src/styles/index.css` (e.g., `--color-accent`, `--color-energy`). Keep visual decisions in CSS variables, not hardcoded Tailwind arbitrary values.

## Dev commands

```sh
npm run dev       # Vite dev server (hot reload)
npm run build     # Production build → dist/
npm run preview   # Serve the dist/ build locally
npm run lint      # ESLint
```

## Key design principles

- **Simulation is framework-agnostic.** `GameEngine` has zero React imports. It can be unit-tested, replaced, or ported without touching any component.
- **One-way data flow.** Engine → store → components. Components never write to the engine except through the store's action functions.
- **Constants in one place.** All game-balance numbers (`BASE_REVOLUTION_MS`, `UPGRADE_COST_EXPONENT`, etc.) live in `constants.js`. Do not scatter magic numbers into components or the engine.
- **Delta-time everywhere.** All simulation uses elapsed milliseconds, never assumes a fixed frame rate.
- **Offline progress.** On load, the engine calculates how long the player was away (capped at `MAX_OFFLINE_MS` = 4 hours) and credits the energy they would have earned.
- **Autosave on interval.** The engine saves to `localStorage` every `AUTOSAVE_INTERVAL_MS` (5 s) and also on tab hide / component unmount.
- **Dark minimalist aesthetic.** Deep navy/dark backgrounds (`#0a0a0f`), purple accent (`#7c6ff7`), gold energy color (`#f0c060`). Glows via SVG filters and CSS `drop-shadow`. Avoid bright colors or light themes.
