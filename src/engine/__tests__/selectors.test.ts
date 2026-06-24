import { describe, it, expect } from 'vitest';
import {
  setupProgress,
  fleetProgress,
  milestoneFor,
  labelFor,
  parseCellLabel,
  formatMove,
} from '../selectors';
import type { FleetDef } from '../selectors';
import { createBoard, placeShip, fireShot } from '../board';
import type { Board } from '../types';
import { BOARD_SIZE } from '../types';

const FLEET_DEF: FleetDef[] = [
  { name: 'Carrier', length: 5 },
  { name: 'Battleship', length: 4 },
  { name: 'Cruiser', length: 3 },
  { name: 'Submarine', length: 3 },
  { name: 'Destroyer', length: 2 },
];

// ─── §6.1 Unit tests — setupProgress ────────────────────────────────────────

describe('setupProgress', () => {
  it('empty board → placed 0, nextShip = first, percent 0, isComplete false', () => {
    const board = createBoard();
    const result = setupProgress(board, FLEET_DEF);
    expect(result.placed).toBe(0);
    expect(result.total).toBe(5);
    expect(result.remaining).toBe(5);
    expect(result.nextShip).toEqual({ name: 'Carrier', length: 5 });
    expect(result.percent).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  it('after N legal placements → placed N, nextShip = fleetDef[N]', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 });

    const result = setupProgress(board, FLEET_DEF);
    expect(result.placed).toBe(2);
    expect(result.remaining).toBe(3);
    expect(result.nextShip).toEqual({ name: 'Cruiser', length: 3 });
    expect(result.percent).toBe(40);
  });

  it('rejected placement → no change (board unchanged)', () => {
    const board = createBoard();
    // Attempting to place ship out of bounds throws; board stays empty
    expect(() =>
      placeShip(board, { origin: { x: 8, y: 0 }, orientation: 'horizontal', length: 5 }),
    ).toThrow();
    // Board unchanged
    const result = setupProgress(board, FLEET_DEF);
    expect(result.placed).toBe(0);
    expect(result.nextShip).toEqual({ name: 'Carrier', length: 5 });
  });

  it('full fleet → placed = total, nextShip null, isComplete true, percent 100', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 });
    board = placeShip(board, { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 });
    board = placeShip(board, { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 });
    board = placeShip(board, { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 });

    const result = setupProgress(board, FLEET_DEF);
    expect(result.placed).toBe(5);
    expect(result.total).toBe(5);
    expect(result.remaining).toBe(0);
    expect(result.nextShip).toBeNull();
    expect(result.isComplete).toBe(true);
    expect(result.percent).toBe(100);
  });

  it('randomize sets progress directly to complete (all 5 ships on board)', () => {
    // Simulate auto-placed board with 5 ships
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 });
    board = placeShip(board, { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 });
    board = placeShip(board, { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 });
    board = placeShip(board, { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 });

    const result = setupProgress(board, FLEET_DEF);
    expect(result.isComplete).toBe(true);
    expect(result.percent).toBe(100);
  });

  it('handles empty fleet definition', () => {
    const board = createBoard();
    const result = setupProgress(board, []);
    expect(result.placed).toBe(0);
    expect(result.total).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.isComplete).toBe(true);
    expect(result.nextShip).toBeNull();
  });
});

// ─── §6.2 Unit tests — fleetProgress ────────────────────────────────────────

describe('fleetProgress', () => {
  function boardWithShipsAndShots(): Board {
    let board = createBoard();
    // Place a small fleet: 2-cell ship at (0,0)→(1,0), 2-cell ship at (0,1)→(1,1)
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 2 });
    return board;
  }

  it('no sinks → sunk 0, percent 0, isDefeated false', () => {
    const board = boardWithShipsAndShots();
    const result = fleetProgress(board);
    expect(result.total).toBe(2);
    expect(result.sunk).toBe(0);
    expect(result.remaining).toBe(2);
    expect(result.percent).toBe(0);
    expect(result.isDefeated).toBe(false);
  });

  it('non-sinking hit → counts unchanged', () => {
    let board = boardWithShipsAndShots();
    // Hit one cell of first ship — not sunk yet
    const { board: b } = fireShot(board, { x: 0, y: 0 });
    board = b;
    const result = fleetProgress(board);
    expect(result.sunk).toBe(0);
    expect(result.remaining).toBe(2);
    expect(result.percent).toBe(0);
  });

  it('one sink → sunk 1, remaining decremented, percent recomputed', () => {
    let board = boardWithShipsAndShots();
    // Sink first ship (2 cells: (0,0) and (1,0))
    let r = fireShot(board, { x: 0, y: 0 });
    r = fireShot(r.board, { x: 1, y: 0 });
    board = r.board;
    const result = fleetProgress(board);
    expect(result.sunk).toBe(1);
    expect(result.remaining).toBe(1);
    expect(result.percent).toBe(50);
  });

  it('full defeat → percent 100, isDefeated true', () => {
    let board = boardWithShipsAndShots();
    // Sink both ships
    let r = fireShot(board, { x: 0, y: 0 });
    r = fireShot(r.board, { x: 1, y: 0 });
    r = fireShot(r.board, { x: 0, y: 1 });
    r = fireShot(r.board, { x: 1, y: 1 });
    board = r.board;
    const result = fleetProgress(board);
    expect(result.sunk).toBe(2);
    expect(result.remaining).toBe(0);
    expect(result.percent).toBe(100);
    expect(result.isDefeated).toBe(true);
  });

  it('empty fleet → no NaN, clamp 0-100', () => {
    const board = createBoard(); // no ships
    const result = fleetProgress(board);
    expect(result.total).toBe(0);
    expect(result.sunk).toBe(0);
    expect(result.percent).toBe(0);
    expect(Number.isNaN(result.percent)).toBe(false);
    expect(result.isDefeated).toBe(false);
  });
});

// ─── §6.3 Unit tests — milestone logic ──────────────────────────────────────

describe('milestoneFor', () => {
  it('returns null below 50%', () => {
    expect(milestoneFor(0)).toBeNull();
    expect(milestoneFor(20)).toBeNull();
    expect(milestoneFor(49)).toBeNull();
  });

  it('returns 50 at exactly 50%', () => {
    expect(milestoneFor(50)).toBe(50);
  });

  it('returns 50 between 50 and 69', () => {
    expect(milestoneFor(60)).toBe(50);
    expect(milestoneFor(69)).toBe(50);
  });

  it('returns 70 between 70 and 89', () => {
    expect(milestoneFor(70)).toBe(70);
    expect(milestoneFor(80)).toBe(70);
    expect(milestoneFor(89)).toBe(70);
  });

  it('returns 90 between 90 and 99', () => {
    expect(milestoneFor(90)).toBe(90);
    expect(milestoneFor(99)).toBe(90);
  });

  it('returns 100 at 100%', () => {
    expect(milestoneFor(100)).toBe(100);
  });

  it('milestones fire once per threshold in a scripted progression', () => {
    // Simulate a 5-ship game: sinking ships one by one → 20, 40, 60, 80, 100%
    const percents = [20, 40, 60, 80, 100];
    const crossed = new Set<number>();
    const fired: number[] = [];

    for (const p of percents) {
      const m = milestoneFor(p);
      if (m !== null && !crossed.has(m)) {
        crossed.add(m);
        fired.push(m);
      }
    }

    // Only 50 is skipped (never exactly hit), we get 50 at 60%, 70 at 80%, 90 at ?, 100
    // Actually: 20→null, 40→null, 60→50, 80→70, 100→100
    expect(fired).toEqual([50, 70, 100]);
  });

  it('no repeats on non-crossing shots', () => {
    // Hitting 60% twice should only fire milestone once
    const crossed = new Set<number>();
    const fired: number[] = [];

    for (const p of [60, 60, 60]) {
      const m = milestoneFor(p);
      if (m !== null && !crossed.has(m)) {
        crossed.add(m);
        fired.push(m);
      }
    }
    expect(fired).toEqual([50]); // fires once
  });
});

// ─── §6.4 Unit tests — Feature 3 (coordinate + announcement logic) ──────────

describe('labelFor / parseCellLabel', () => {
  it('round-trip: for all 100 cells, parseCellLabel(labelFor(coord)) === coord', () => {
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        const label = labelFor({ x, y });
        const parsed = parseCellLabel(label);
        expect(parsed).toEqual({ x, y });
      }
    }
  });

  it('no label collisions: all 100 labels are unique', () => {
    const labels = new Set<string>();
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        labels.add(labelFor({ x, y }));
      }
    }
    expect(labels.size).toBe(100);
  });

  it('specific examples: {x:0,y:0}→A1, {x:2,y:2}→C3, {x:9,y:9}→J10', () => {
    expect(labelFor({ x: 0, y: 0 })).toBe('A1');
    expect(labelFor({ x: 2, y: 2 })).toBe('C3');
    expect(labelFor({ x: 9, y: 9 })).toBe('J10');
  });
});

describe('formatMove', () => {
  it('miss → "Computer fires at C3 — Miss"', () => {
    const result = formatMove({ x: 2, y: 2 }, 'miss');
    expect(result).toBe('Computer fires at C3 \u2014 Miss');
  });

  it('hit → "Computer fires at A1 — Hit!"', () => {
    const result = formatMove({ x: 0, y: 0 }, 'hit');
    expect(result).toBe('Computer fires at A1 \u2014 Hit!');
  });

  it('sunk → "Computer fires at D5 — Hit! Your Destroyer is sunk"', () => {
    const result = formatMove({ x: 3, y: 4 }, 'sunk', 'Destroyer');
    expect(result).toBe('Computer fires at D5 \u2014 Hit! Your Destroyer is sunk');
  });

  it('announcement matches engine: scripted shot result matches format', () => {
    // Place a 2-cell ship at (0,0)→(1,0) and fire both cells
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 });
    let r = fireShot(board, { x: 0, y: 0 });
    expect(r.result).toBe('hit');
    // formatMove for the engine's result
    const msg1 = formatMove({ x: 0, y: 0 }, r.result);
    expect(msg1).toBe('Computer fires at A1 \u2014 Hit!');

    // Now sink it
    r = fireShot(r.board, { x: 1, y: 0 });
    expect(r.result).toBe('sunk');
    expect(r.sunkShip).not.toBeNull();
    const msg2 = formatMove({ x: 1, y: 0 }, r.result, 'Carrier');
    expect(msg2).toContain('Hit! Your Carrier is sunk');
  });
});
