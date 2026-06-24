import { describe, it, expect } from 'vitest';
import { playerAccuracy } from '../selectors';
import { createBoard, placeShip, fireShot, getCellState } from '../board';
import type { Board } from '../types';

function boardWithShipsAndShots(
  ships: { origin: { x: number; y: number }; orientation: 'horizontal' | 'vertical'; length: number }[],
  shots: { x: number; y: number }[],
): Board {
  let board = createBoard();
  for (const ship of ships) {
    board = placeShip(board, ship);
  }
  for (const coord of shots) {
    const result = fireShot(board, coord);
    board = result.board;
  }
  return board;
}

describe('playerAccuracy', () => {
  it('zero shots → 0%, no NaN or divide-by-zero', () => {
    const board = createBoard();
    const acc = playerAccuracy(board);
    expect(acc.shots).toBe(0);
    expect(acc.hits).toBe(0);
    expect(acc.percent).toBe(0);
    expect(Number.isNaN(acc.percent)).toBe(false);
  });

  it('all hits → 100%', () => {
    const board = boardWithShipsAndShots(
      [{ origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
    );
    const acc = playerAccuracy(board);
    expect(acc.shots).toBe(3);
    expect(acc.hits).toBe(3);
    expect(acc.percent).toBe(100);
  });

  it('all misses → 0%', () => {
    const board = boardWithShipsAndShots(
      [{ origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 }],
      [{ x: 5, y: 5 }, { x: 6, y: 6 }, { x: 7, y: 7 }],
    );
    const acc = playerAccuracy(board);
    expect(acc.shots).toBe(3);
    expect(acc.hits).toBe(0);
    expect(acc.percent).toBe(0);
  });

  it('mixed shots rounds correctly', () => {
    // 1 hit out of 3 shots = 33.33% → rounds to 33
    const board = boardWithShipsAndShots(
      [{ origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 }],
      [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 6, y: 6 }],
    );
    const acc = playerAccuracy(board);
    expect(acc.shots).toBe(3);
    expect(acc.hits).toBe(1);
    expect(acc.percent).toBe(33);
  });

  it('percent is clamped 0–100', () => {
    // With normal boards this should always be true, but verify
    const board = boardWithShipsAndShots(
      [{ origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 }],
      [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }],
    );
    const acc = playerAccuracy(board);
    expect(acc.percent).toBeGreaterThanOrEqual(0);
    expect(acc.percent).toBeLessThanOrEqual(100);
  });

  it('hits parity: matches the board own hit rendering for the same shots', () => {
    // Fire a mix of hits and misses, then check that accuracy.hits matches
    // the number of cells the board renders as 'hit' or 'sunk'
    const ships = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal' as const, length: 3 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal' as const, length: 2 },
    ];
    const shots = [
      { x: 0, y: 0 }, { x: 1, y: 0 },  // 2 hits on ship 1
      { x: 5, y: 5 }, { x: 6, y: 6 },  // 2 misses
      { x: 0, y: 2 }, { x: 1, y: 2 },  // 2 hits (sinks ship 2)
    ];
    const board = boardWithShipsAndShots(ships, shots);
    const acc = playerAccuracy(board);

    // Count hit+sunk cells on the board using getCellState (showShips=false = opponent view)
    let boardHitCount = 0;
    for (const shot of shots) {
      const state = getCellState(board, shot, false);
      if (state === 'hit' || state === 'sunk') boardHitCount++;
    }

    expect(acc.hits).toBe(boardHitCount);
  });
});
