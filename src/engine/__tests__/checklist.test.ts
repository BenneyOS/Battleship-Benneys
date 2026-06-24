import { describe, it, expect } from 'vitest';
import { enemyFleetStatus, fleetProgress } from '../selectors';
import { createBoard, placeShip, fireShot, shipCells, coordKey, fleetDefeated } from '../board';
import type { Board, Ship } from '../types';

function buildFullBoard(): Board {
  let board = createBoard();
  const ships: Ship[] = [
    { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
    { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
    { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
    { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
    { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
  ];
  for (const ship of ships) {
    board = placeShip(board, ship);
  }
  return board;
}

describe('enemyFleetStatus', () => {
  it('lists all five ships with correct name/length, all afloat before any shots', () => {
    const board = buildFullBoard();
    const status = enemyFleetStatus(board);
    expect(status).toHaveLength(5);
    expect(status[0]).toEqual({ name: 'Carrier', length: 5, sunk: false });
    expect(status[1]).toEqual({ name: 'Battleship', length: 4, sunk: false });
    expect(status[2]).toEqual({ name: 'Cruiser', length: 3, sunk: false });
    expect(status[3]).toEqual({ name: 'Submarine', length: 3, sunk: false });
    expect(status[4]).toEqual({ name: 'Destroyer', length: 2, sunk: false });
  });

  it('sinking one ship marks exactly that ship sunk; others unchanged', () => {
    let board = buildFullBoard();
    // Sink the Destroyer (length 2 at row 4: (0,4) and (1,4))
    board = fireShot(board, { x: 0, y: 4 }).board;
    board = fireShot(board, { x: 1, y: 4 }).board;

    const status = enemyFleetStatus(board);
    expect(status[4].sunk).toBe(true); // Destroyer sunk
    expect(status[0].sunk).toBe(false);
    expect(status[1].sunk).toBe(false);
    expect(status[2].sunk).toBe(false);
    expect(status[3].sunk).toBe(false);
  });

  it('a non-sinking hit leaves all statuses unchanged', () => {
    let board = buildFullBoard();
    // Hit only one cell of the Carrier
    board = fireShot(board, { x: 0, y: 0 }).board;

    const status = enemyFleetStatus(board);
    expect(status.every((s) => !s.sunk)).toBe(true);
  });

  it('consistency: sunk count equals fleetProgress.sunk at every step of a scripted game', () => {
    let board = buildFullBoard();
    const allShips = board.ships;

    // Sink ships one by one and verify parity at each step
    for (let shipIdx = 0; shipIdx < allShips.length; shipIdx++) {
      const ship = allShips[shipIdx];
      const cells = shipCells(ship);
      for (const cell of cells) {
        if (!board.shots.has(coordKey(cell))) {
          board = fireShot(board, cell).board;
        }
      }

      const status = enemyFleetStatus(board);
      const progress = fleetProgress(board);
      const checklistSunkCount = status.filter((s) => s.sunk).length;
      expect(checklistSunkCount).toBe(progress.sunk);
    }
  });

  it('full defeat: all entries sunk, coincides with isFleetDefeated / win', () => {
    let board = buildFullBoard();
    // Sink all ships
    for (const ship of board.ships) {
      const cells = shipCells(ship);
      for (const cell of cells) {
        if (!board.shots.has(coordKey(cell))) {
          board = fireShot(board, cell).board;
        }
      }
    }

    const status = enemyFleetStatus(board);
    expect(status.every((s) => s.sunk)).toBe(true);
    expect(fleetDefeated(board)).toBe(true);
  });

  it('no status entry carries coordinate/position data for afloat ships', () => {
    const board = buildFullBoard();
    const status = enemyFleetStatus(board);
    for (const entry of status) {
      // Each entry should only have name, length, sunk — no coords
      const keys = Object.keys(entry);
      expect(keys).toEqual(['name', 'length', 'sunk']);
      // Verify no position-related data leaks
      expect(entry).not.toHaveProperty('origin');
      expect(entry).not.toHaveProperty('cells');
      expect(entry).not.toHaveProperty('orientation');
      expect(entry).not.toHaveProperty('x');
      expect(entry).not.toHaveProperty('y');
    }
  });
});
