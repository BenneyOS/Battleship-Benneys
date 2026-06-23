# Bug Write-Up: Battleship Engine Development

## Summary

All 45 engine tests passed on the first run. The test-first approach with a clean architecture (pure engine layer with no side effects) prevented bugs from occurring. Below are the design decisions that served as preventive measures, plus the TypeScript compilation issues encountered and resolved.

---

### Issue 1: TypeScript Unused Variable Errors

**Symptom:** `tsc -b` reported 5 unused variable errors across `App.tsx` and `engine.test.ts`.

**Root Cause:** During development, intermediate variables (`hoverCoord`, `setHoverCoord`, `rng`, `missCoord`, `b`) were declared but their usage was either removed in refactoring or never wired up.

**Fix:** Removed the unused `hoverCoord`/`setHoverCoord` state from `App.tsx` (hover preview simplified away). Cleaned up test file by removing unused RNG instances and the unused `missCoord` variable. Re-added `const b = mulberry32(2)` which was accidentally removed during cleanup.

**Guarding Test:** TypeScript strict mode (`noUnusedLocals: true`, `noUnusedParameters: true`) catches these at compile time.

---

### Issue 2: Vitest/Vite Type Conflict in `vite.config.ts`

**Symptom:** `tsc -b` failed with "No overload matches this call" when using `defineConfig` from `vitest/config` with the `react()` plugin — type mismatch between Vitest's bundled Vite types and the project's Vite types.

**Root Cause:** Vitest 3.x bundles its own version of Vite internally, and the `Plugin` types from `@vitejs/plugin-react` (compiled against the project's Vite 8.x) were incompatible with Vitest's bundled Vite types.

**Fix:** Split configuration into two files: `vite.config.ts` (uses `vite`'s `defineConfig` for the app build) and `vitest.config.ts` (uses `vitest/config`'s `defineConfig` for test configuration only). This avoids mixing plugin types across different Vite versions.

**Guarding Test:** The `npm run build` command runs `tsc -b && vite build`, which would catch any recurrence.

---

## Preventive Design Decisions

1. **Pure functions for `placeShip` and `fireShot`**: Return new `Board` objects, never mutate. Tested explicitly with immutability assertions.

2. **Derived state only**: Board stores `ships[]` and `shots: Set<string>`. Cell state, `isSunk`, and `fleetDefeated` are all computed — no stale cache to desynchronize.

3. **Seedable RNG (mulberry32)**: All randomness is injected. Tests are deterministic and reproducible with any seed.

4. **Phase state machine with guards**: Every function (`placeShip`, `humanFire`, `aiFire`) checks phase and turn before proceeding. 6 guard tests verify all illegal transitions throw.

5. **AI hunt/target**: Cleans sunk-ship coords from target queue, preventing wasted shots. Tested with 100 consecutive non-repeating shots.
