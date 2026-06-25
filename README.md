# Battleship - Benney's Edition

A browser-based Battleship game: one human vs. an AI opponent on a 10x10 grid with the classic fleet (5, 4, 3, 3, 2).

## Play Online

**[Play Now](https://benneyos.github.io/Battleship-Benneys/)**

## Architecture

Three clean layers with strict dependency direction:

```
Presentation (React) -> Application (state hook) -> Engine (pure functions)
```

- **Engine** (`src/engine/`): Pure functions, zero dependencies. Seedable RNG, immutable board operations, derived state, hunt/target AI.
- **Application** (`src/app/`): React hook managing game state machine (setup -> playing -> gameOver).
- **Presentation** (`src/ui/`, `src/App.tsx`): React components rendering boards and handling user input.

### Key Design Decisions

- **Derived state**: Boards store only ships (origin + orientation + length) and a `Set<string>` of fired coordinates. Cell states, sunk status, and fleet defeat are computed on the fly.
- **Immutability**: `placeShip` and `fireShot` return new board objects, never mutate.
- **Seedable RNG**: Mulberry32 PRNG injected into all randomness. No `Math.random()` in the engine.
- **AI**: Hunt/target strategy. Random shots until a hit, then probes orthogonal neighbors.

## Install

```bash
npm install
```

## Test

```bash
npm test
```

45 tests covering: placement validation, shot mechanics, derived state, AI behavior, phase/turn guards, and full scripted games.

## Run (Development)

```bash
npm run dev
```

Opens at `http://localhost:5173`.

## Build

```bash
npm run build
```

Output in `dist/`.

## Deploy

Deployed automatically via GitHub Pages on push to `main`. The GitHub Actions workflow builds and deploys to `https://benneyos.github.io/Battleship-Benneys/`.

## How to Play

1. **Setup**: Click cells on "Your Fleet" board to place ships. Press **R** to toggle desktop orientation. Or click "Auto-Place Ships".
2. **Start**: Click "Start Game" once all 5 ships are placed.
3. **Play**: Click cells on "Enemy Waters" to fire. The AI fires back automatically.
4. **Win**: Sink all enemy ships before the AI sinks yours.

## Tech Stack

- React 19 + TypeScript
- Vite 8
- Vitest 3

## Built with Devin (Cognition)

- Built by directing Devin. PRDs drafted in Claude, with human reviewing, diagnosing, and re-specifying improvements


