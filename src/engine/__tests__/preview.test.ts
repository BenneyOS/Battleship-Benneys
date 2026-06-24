import { describe, it, expect } from 'vitest';
import { footprintCells, previewPlacement } from '../selectors';
import { createBoard, placeShip } from '../board';
import type { Board } from '../types';

describe('footprintCells', () => {
  it('returns correct cells for horizontal placement', () => {
    const cells = footprintCells({ x: 2, y: 3 }, 4, 'horizontal');
    expect(cells).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ]);
  });

  it('returns correct cells for vertical placement', () => {
    const cells = footprintCells({ x: 0, y: 0 }, 3, 'vertical');
    expect(cells).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ]);
  });

  it('handles length 1 ship', () => {
    const cells = footprintCells({ x: 5, y: 5 }, 1, 'horizontal');
    expect(cells).toEqual([{ x: 5, y: 5 }]);
  });

  it('handles anchor at board edge horizontally', () => {
    const cells = footprintCells({ x: 8, y: 0 }, 5, 'horizontal');
    expect(cells).toHaveLength(5);
    expect(cells[4]).toEqual({ x: 12, y: 0 }); // off-board, but footprint doesn't validate
  });
});

describe('previewPlacement', () => {
  it('returns isValid=true for a legal placement on empty board', () => {
    const board = createBoard();
    const result = previewPlacement(board, { x: 0, y: 0 }, 5, 'horizontal');
    expect(result.isValid).toBe(true);
    expect(result.cells).toHaveLength(5);
    expect(result.cells[0]).toEqual({ x: 0, y: 0 });
    expect(result.cells[4]).toEqual({ x: 4, y: 0 });
  });

  it('returns isValid=false when ship goes off-board (horizontal)', () => {
    const board = createBoard();
    const result = previewPlacement(board, { x: 8, y: 0 }, 5, 'horizontal');
    expect(result.isValid).toBe(false);
    expect(result.cells).toHaveLength(5); // cells still returned for ghost rendering
  });

  it('returns isValid=false when ship goes off-board (vertical)', () => {
    const board = createBoard();
    const result = previewPlacement(board, { x: 0, y: 9 }, 3, 'vertical');
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=false when ship overlaps another', () => {
    let board: Board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    const result = previewPlacement(board, { x: 2, y: 0 }, 3, 'horizontal');
    expect(result.isValid).toBe(false);
  });

  it('returns isValid=true for non-overlapping placement', () => {
    let board: Board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    const result = previewPlacement(board, { x: 0, y: 1 }, 4, 'horizontal');
    expect(result.isValid).toBe(true);
  });

  it('parity: isValid matches engine isLegalPlacement for valid positions', () => {
    const board = createBoard();
    // All corners should be valid for a length-2 ship
    const corners = [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 0, y: 8 },
      { x: 8, y: 8 },
    ];
    for (const anchor of corners) {
      const preview = previewPlacement(board, anchor, 2, 'horizontal');
      let engineValid = true;
      try {
        placeShip(board, { origin: anchor, orientation: 'horizontal', length: 2 });
      } catch {
        engineValid = false;
      }
      expect(preview.isValid).toBe(engineValid);
    }
  });

  it('parity: isValid matches engine isLegalPlacement for off-board positions', () => {
    const board = createBoard();
    const result = previewPlacement(board, { x: 9, y: 0 }, 3, 'horizontal');
    let engineValid = true;
    try {
      placeShip(board, { origin: { x: 9, y: 0 }, orientation: 'horizontal', length: 3 });
    } catch {
      engineValid = false;
    }
    expect(result.isValid).toBe(engineValid);
  });

  it('rotating at fixed anchor updates footprint and flips validity near edge', () => {
    const board = createBoard();
    // Anchor at (8, 0) with length 3: horizontal goes off-board, vertical stays in
    const hResult = previewPlacement(board, { x: 8, y: 0 }, 3, 'horizontal');
    const vResult = previewPlacement(board, { x: 8, y: 0 }, 3, 'vertical');
    expect(hResult.isValid).toBe(false);
    expect(vResult.isValid).toBe(true);
    // Footprints differ
    expect(hResult.cells).not.toEqual(vResult.cells);
  });

  it('committed placement equals previewed footprint', () => {
    const board = createBoard();
    const anchor = { x: 3, y: 2 };
    const length = 4;
    const orientation = 'vertical' as const;

    const preview = previewPlacement(board, anchor, length, orientation);
    expect(preview.isValid).toBe(true);

    // Commit
    const newBoard = placeShip(board, { origin: anchor, orientation, length });
    const committedShip = newBoard.ships[newBoard.ships.length - 1];

    // The committed ship occupies exactly the preview cells
    const committedCells = [];
    for (let i = 0; i < committedShip.length; i++) {
      committedCells.push({
        x: committedShip.origin.x + (committedShip.orientation === 'horizontal' ? i : 0),
        y: committedShip.origin.y + (committedShip.orientation === 'vertical' ? i : 0),
      });
    }
    expect(committedCells).toEqual(preview.cells);
  });
});
