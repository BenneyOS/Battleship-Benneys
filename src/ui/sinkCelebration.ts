import type { LastShotEvent } from './headerStatus';
import type { FleetProgressData } from '../engine/selectors';

// ─── Sink Celebration View-Model ─────────────────────────────────────────────

export interface SinkCelebrationData {
  sunkShipName: string;
  intensityLevel: number;   // 1-based: 1st sink = 1, 2nd = 2, etc.
  isFinalShip: boolean;     // true iff this sink defeats the fleet
}

/**
 * Derive celebration data from a sunk ShotResult + fleet state.
 * Returns null for non-sinking results (miss/hit).
 * intensityLevel = number of ships sunk so far (including this one).
 * isFinalShip = true iff fleet is defeated (coincides with isFleetDefeated/win).
 */
export function deriveSinkCelebration(
  lastShot: LastShotEvent | null,
  fleetProgress: FleetProgressData,
): SinkCelebrationData | null {
  if (!lastShot || lastShot.outcome !== 'sunk') return null;

  const sunkShipName = lastShot.sunkShipName ?? 'Enemy ship';
  const intensityLevel = fleetProgress.sunk;
  const isFinalShip = fleetProgress.isDefeated;

  return { sunkShipName, intensityLevel, isFinalShip };
}
