---
name: testing-battleship
description: Test the Battleship game end-to-end. Use when verifying game UI, engine logic, or deployment changes.
---

# Testing the Battleship Game

## Local Dev Setup

```bash
cd /home/ubuntu/Battleship-Benneys
npm install
npm run dev -- --host
```

The dev server runs on `http://localhost:5173/Battleship-Benneys/` (port may increment if occupied — check terminal output).

Note: The `base` path in `vite.config.ts` is `/Battleship-Benneys/`, so the app is served at that subpath.

## Running Unit Tests

```bash
npm test        # runs vitest (45 engine tests)
npm run lint    # eslint
npm run build   # tsc + vite build
```

## Game Phases & UI Elements

The game has 3 phases: `setup` → `playing` → `gameOver`.

### Setup Phase
- **Message**: "Place your N-cell ship. Press R to rotate."
- **Buttons**: "Auto-Place Ships" (always visible), "Start Game" (appears after all 5 ships placed)
- **Ship status pills**: Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2)
  - Blue = current ship to place
  - Gray = pending
  - Green with checkmark = placed
- **Orientation toggle**: Press R key to toggle horizontal/vertical, shown in UI text
- **Grids**: "Your Fleet" (left, clickable for placement) and "Enemy Waters" (right, not clickable)

### Playing Phase
- **Message**: "Game on! Click on the enemy board to fire." then "Your turn -- fire at the enemy board."
- Ship pills disappear, legend (Miss/Hit/Sunk) appears at bottom
- Click cells on "Enemy Waters" to fire
- AI fires back automatically after each human shot
- Cell colors: empty=#1a2a3a, ship=#4a7c59(green), miss=#3a4a5a(gray) with bullet, hit=#c0392b(red) with X, sunk=#7b241c(dark red) with X

### Game Over Phase
- **Message**: "You win! All enemy ships sunk!" or "AI wins! Your fleet has been sunk."
- "New Game" button appears
- Enemy board no longer clickable

## Key Test Scenarios

1. **Full game flow**: Auto-place → Start Game → fire shots → game over → New Game reset
2. **Manual placement with R-key rotation**: Toggle orientation, place ships in both directions
3. **Invalid placement**: Try placing ship out of bounds → expect "Invalid placement: Ship out of bounds" error
4. **Duplicate shot rejection**: Fire at same cell twice → expect "Duplicate shot" message, no AI response
5. **Game reset**: Click New Game → both boards clear, setup UI restored

## Tips

- Playing a full game manually takes many clicks (~50-80 shots). Use CDP/Playwright to automate firing shots if you need to reach game over quickly.
- The app uses `Date.now()` as the RNG seed, so each game is different.
- The `vitest.config.ts` is separate from `vite.config.ts` to avoid type conflicts between Vitest 3.x and Vite 8.x.
- No secrets or authentication needed — the game is fully client-side.

## Devin Secrets Needed

None — this is a static client-side game with no backend or authentication.
