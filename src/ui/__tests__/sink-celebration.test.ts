import { describe, it, expect } from 'vitest';
import { deriveSinkCelebration } from '../sinkCelebration';
import type { LastShotEvent } from '../headerStatus';
import type { FleetProgressData } from '../../engine/selectors';

function makeFleetProgress(sunk: number, total: number = 5): FleetProgressData {
  return {
    total,
    sunk,
    remaining: total - sunk,
    percent: total === 0 ? 0 : Math.round((sunk / total) * 100),
    isDefeated: total > 0 && sunk === total,
  };
}

describe('deriveSinkCelebration', () => {
  it('returns null for null lastShot', () => {
    expect(deriveSinkCelebration(null, makeFleetProgress(0))).toBeNull();
  });

  it('returns null for a miss', () => {
    const shot: LastShotEvent = { actor: 'human', coord: { x: 0, y: 0 }, outcome: 'miss' };
    expect(deriveSinkCelebration(shot, makeFleetProgress(0))).toBeNull();
  });

  it('returns null for a non-sinking hit', () => {
    const shot: LastShotEvent = { actor: 'human', coord: { x: 0, y: 0 }, outcome: 'hit' };
    expect(deriveSinkCelebration(shot, makeFleetProgress(0))).toBeNull();
  });

  it('returns descriptor with correct ship name for a sunk result', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Destroyer',
    };
    const result = deriveSinkCelebration(shot, makeFleetProgress(1));
    expect(result).not.toBeNull();
    expect(result!.sunkShipName).toBe('Destroyer');
  });

  it('uses fallback name when sunkShipName is undefined', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
    };
    const result = deriveSinkCelebration(shot, makeFleetProgress(1));
    expect(result).not.toBeNull();
    expect(result!.sunkShipName).toBe('Enemy ship');
  });

  it('intensityLevel increases with the number of ships sunk', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Cruiser',
    };

    const result1 = deriveSinkCelebration(shot, makeFleetProgress(1));
    const result2 = deriveSinkCelebration(shot, makeFleetProgress(2));
    const result3 = deriveSinkCelebration(shot, makeFleetProgress(3));

    expect(result1!.intensityLevel).toBe(1);
    expect(result2!.intensityLevel).toBe(2);
    expect(result3!.intensityLevel).toBe(3);
    expect(result3!.intensityLevel).toBeGreaterThan(result2!.intensityLevel);
    expect(result2!.intensityLevel).toBeGreaterThan(result1!.intensityLevel);
  });

  it('isFinalShip is true only when this sink defeats the fleet (coincides with isFleetDefeated)', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Carrier',
    };

    // Not final (4 of 5 sunk)
    const notFinal = deriveSinkCelebration(shot, makeFleetProgress(4));
    expect(notFinal!.isFinalShip).toBe(false);

    // Final (5 of 5 sunk = fleet defeated)
    const final = deriveSinkCelebration(shot, makeFleetProgress(5));
    expect(final!.isFinalShip).toBe(true);
    expect(makeFleetProgress(5).isDefeated).toBe(true);
  });

  it('isFinalShip coincides exactly with isFleetDefeated/win', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Carrier',
    };

    for (let sunk = 1; sunk <= 5; sunk++) {
      const fp = makeFleetProgress(sunk);
      const result = deriveSinkCelebration(shot, fp);
      expect(result!.isFinalShip).toBe(fp.isDefeated);
    }
  });
});
