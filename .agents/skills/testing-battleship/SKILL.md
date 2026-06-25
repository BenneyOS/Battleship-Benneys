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

## Visual / CSS Testing

When testing CSS subtraction fixes (removing backgrounds, borders, shadows):

1. **Visual inspection at desktop (~1280px)**: Check setup and battle screens for visual anomalies (dark bands, divider lines, asymmetric edge lines)
2. **DevTools computed styles**: Use `getComputedStyle(element)` in Console to verify CSS properties are actually removed (transparent background, 0px border, no box-shadow). This is more reliable than visual inspection alone.
3. **Mobile viewport (375px)**: Use Chrome DevTools responsive mode (device toggle icon) to test at mobile width. The app has a breakpoint at 900px.
4. **Zoom into header area**: Use the zoom tool on the header region to closely inspect for subtle color differences or lines that might not be visible at normal zoom.

### Mobile HUD Console Testing
When testing the HUD console at mobile widths (375px):
1. **Enter battle phase first**: Auto-Place Ships → Start Battle. The HUD console only appears during the `playing` phase.
2. **Check for cramming/overlap**: At 375px, the HUD has limited horizontal space. Verify that turn banner, accuracy chip, and turn count don't overlap or collide.
3. **Verify hidden elements via DevTools**: Some elements may be hidden on mobile for space. Use `getComputedStyle()` to distinguish between:
   - `display: none` — removes from both visual AND accessibility tree (OK for decorative elements with `aria-hidden="true"`)
   - Visually-hidden pattern (`position: absolute; width: 1px; height: 1px; clip: rect(0,0,0,0)`) — hides visually but keeps in accessibility tree (required for meaningful content like labels)
4. **Desktop regression**: After mobile testing, switch to 1280px and verify ALL HUD elements are visible. The mobile rules should be scoped inside `@media (max-width: 899px)` — if desktop elements are hidden, the media query scoping is broken.
5. **Adversarial assertion design**: For each hidden element, verify both that it IS hidden on mobile AND that it is NOT hidden on desktop. This catches media query scoping bugs.
6. **Use CDP for computed style checks**: Rather than typing commands into the DevTools Console via GUI (which is fragile), use Chrome DevTools Protocol via WebSocket. Install `ws` (`npm install --no-save ws`) and connect to `ws://localhost:29229/devtools/page/<TARGET_ID>`. Get the target ID from `http://localhost:29229/json`. Use `Runtime.evaluate` to run `getComputedStyle()` checks programmatically — this is faster and more reliable than GUI-based DevTools interaction.
7. **Width math verification**: Measure zone widths via `getBoundingClientRect().width` and sum them. At 375px, available width is ~295-343px depending on padding. Verify `turnZone + accuracyZone + turnsZone + gaps < containerWidth`.
8. **Confirm PR is actually merged before testing deployed site**: A common failure mode is testing the deployed site when the fix PR hasn't been merged yet. Always verify the PR status before concluding the deployed version is broken.

### Architecture notes for visual testing
- `.zone-header` is used in setup and battle phases. The `gameOver` phase bypasses it entirely (uses EndScreen component directly in `.game-stage`).
- `.zone-player` and `.zone-enemy` are the board containers — they should be invisible layout devices (no background, no border).
- Intentional panels with bezels: SETUP banner (`.turn-banner`), HUD console (`.hud-console`), board bezels (`.board-bezel`), companion panels.
- The field gradient is set on `.game-layout` and should flow unbroken edge-to-edge.

## Release QA / Ship Gate Testing

When running a full release QA pass (pre-demo verification):

### Entry Gate Checks
1. Verify all fix PRs are merged to main (check `git log --oneline -5`)
2. Start dev server fresh, load in incognito — zero console errors required
3. Run `npx vitest run` — all tests must pass unchanged before testing begins

### Auto-Fire Script for Game Completion
Use this CDP script to rapidly fire through all enemy cells and reach game-over:
```javascript
// Run via page.evaluate() in Playwright CDP connection
async function autoFire() {
  const sections = document.querySelectorAll('section');
  let enemySection = null;
  sections.forEach(s => {
    const h = s.querySelector('h3');
    if (h && h.textContent.includes('Enemy')) enemySection = s;
  });
  if (!enemySection) return 'NO_ENEMY_SECTION';
  let fired = 0;
  for (let pass = 0; pass < 5; pass++) {
    const rows = enemySection.querySelectorAll('table tbody tr');
    for (let r = 0; r < rows.length; r++) {
      const cells = rows[r].querySelectorAll('td');
      for (let c = 1; c < cells.length; c++) {
        if (document.querySelector('.endgame-screen')) return 'END:' + fired;
        const cell = cells[c];
        const cls = cell.className;
        if (cls.includes('hit') || cls.includes('miss') || cls.includes('sunk')) continue;
        // Wait for YOUR TURN
        for (let w = 0; w < 30; w++) {
          const header = document.querySelector('header');
          if (header && header.textContent.includes('YOUR TURN')) break;
          if (document.querySelector('.endgame-screen')) return 'END:' + fired;
          await new Promise(r => setTimeout(r, 300));
        }
        cell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        fired++;
        await new Promise(r => setTimeout(r, 800));
      }
    }
  }
  return 'EXHAUSTED:' + fired;
}
```
Note: The game outcome (WIN/LOSS) depends on the random AI ship placement and AI firing. You may get DEFEAT instead of VICTORY — retry with a new game if you need a specific outcome.

### R4 Progress Values Verification
The `BattleScoreboard` uses `fleetProgress()` which computes `Math.round((sunk/total)*100)`. For 5 ships, only 0/20/40/60/80/100% are possible. Track the progress bar's `aria-valuenow` attribute during gameplay to verify live. Milestones fire at sunk counts 3 and 4 only (`SUNK_COUNT_MILESTONES = [3, 4]` in selectors.ts).

### R7 Audio Verification
AudioContext can be checked programmatically: `new AudioContext().state` returns 'running' after the first user gesture. Actual audible output may not be verifiable in headless-like environments.

### Key CSS Selectors for Regression Checks
- **R8 (stage invisible)**: `.zone-player`, `.zone-enemy` — check `background`, `border`
- **R9 (seamless plane)**: `.zone-header` — check `background`, `border-bottom`, `box-shadow`
- **R3 (board parity)**: `.zone-player .board-container`, `.zone-enemy .board-container` — check `getBoundingClientRect().width` and `max-width`
- **R2 (stacked header)**: `.hud-console` — check `gridTemplateRows` at mobile widths
- **R5 (CTA containment)**: `button` containing "Start Battle" — check `getBoundingClientRect().width` vs viewport
- **R10 (logo crisp)**: Elements with `[class*="logo"]` — check `text-shadow` for offset values (should be 0px 0px)
- **R11 (panel position)**: `.companion-panel` — check `position` is `static` or `relative`, not `absolute`

### Breakpoints
- 600px: Mobile header switches to stacked 3-row grid
- 899px: Mobile media query boundary (max-width: 899px)
- 900px: Desktop layout kicks in

### Common Pitfalls
- **Accuracy vs Progress confusion**: The accuracy stat (e.g., 13%, 18%) shows hit rate (hits/total shots) — this is NOT the progress percentage. R4 is about the sunk progress bar only.
- **Game outcome randomness**: The AI is random, so you may get DEFEAT when trying to reach VICTORY. Multiple attempts may be needed.
- **Touch placement on mobile**: Ship placement uses single-tap commit (fixed in PR #28). Test by dispatching `MouseEvent('click')` via CDP at mobile viewport.
- **DevTools emulation vs real device**: Chrome DevTools responsive mode does NOT reproduce touch events, haptics, audio unlock timing, or Safari rendering quirks. Always flag real-device testing as a gap when not available.

## Tips

- Playing a full game manually takes many clicks (~50-80 shots). Use CDP/Playwright to automate firing shots if you need to reach game over quickly.
- The app uses `Date.now()` as the RNG seed, so each game is different.
- The `vitest.config.ts` is separate from `vite.config.ts` to avoid type conflicts between Vitest 3.x and Vite 8.x.
- No secrets or authentication needed — the game is fully client-side.
- Port may auto-increment (e.g. 5173 → 5174) if occupied — always check terminal output for the actual URL.
- Connect Playwright via CDP at `http://localhost:29229` — use `chromium.connectOverCDP()` to attach to the running Chrome instance.
- Use `page.evaluate()` for DOM queries and clicks instead of Playwright's `page.click()` — the latter's actionability checks can timeout on game elements.

## Devin Secrets Needed

None — this is a static client-side game with no backend or authentication.
