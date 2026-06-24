/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BattleScoreboard } from '../components/BattleScoreboard';
import { fleetProgress } from '../../engine/selectors';
import { createBoard, placeShip, fireShot } from '../../engine/board';

/**
 * Guard test: headline count, bar fill, and aria-label must always agree
 * with the canonical percent = round(sunk / total * 100).
 *
 * For a 5-ship fleet the expected values are:
 *   0 sunk → 0%, 1 → 20%, 2 → 40%, 3 → 60%, 4 → 80%, 5 → 100%.
 */
describe('BattleScoreboard progress consistency', () => {
  // Build a board with 5 ships (standard fleet) and progressively sink them.
  function buildBoard() {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 }); // Carrier
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 }); // Battleship
    board = placeShip(board, { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 }); // Cruiser
    board = placeShip(board, { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 }); // Submarine
    board = placeShip(board, { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 }); // Destroyer
    return board;
  }

  // Coords to sink each ship in order
  const sinkSequences = [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }, { x: 4, y: 0 }], // Carrier (5)
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],                   // Battleship (4)
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }],                                     // Cruiser (3)
    [{ x: 0, y: 3 }, { x: 1, y: 3 }, { x: 2, y: 3 }],                                     // Submarine (3)
    [{ x: 0, y: 4 }, { x: 1, y: 4 }],                                                       // Destroyer (2)
  ];

  it('at every sunk step: headline, bar width, and aria percent all equal round(sunk/total*100)', () => {
    let board = buildBoard();

    for (let shipIdx = 0; shipIdx < sinkSequences.length; shipIdx++) {
      // Sink the next ship
      for (const coord of sinkSequences[shipIdx]) {
        const result = fireShot(board, coord);
        board = result.board;
      }

      const sunkCount = shipIdx + 1;
      const total = 5;
      const expectedPercent = Math.round((sunkCount / total) * 100);

      // Verify the selector produces the expected percent
      const progress = fleetProgress(board);
      expect(progress.sunk).toBe(sunkCount);
      expect(progress.total).toBe(total);
      expect(progress.percent).toBe(expectedPercent);

      // Render BattleScoreboard with this progress (no milestone — that's cosmetic)
      const { unmount } = render(
        <BattleScoreboard progress={progress} milestoneMessage={null} />,
      );

      // 1. Headline: "X of Y"
      expect(screen.getByText(new RegExp(`${sunkCount} of ${total}`))).toBeInTheDocument();

      // 2. Bar fill width matches percent
      const bar = screen.getByRole('progressbar');
      expect(bar.style.width).toBe(`${expectedPercent}%`);

      // 3. aria-valuenow matches percent
      expect(bar).toHaveAttribute('aria-valuenow', String(expectedPercent));

      // 4. aria-label contains the correct percent
      expect(bar).toHaveAttribute('aria-label', `${expectedPercent}% of enemy fleet destroyed`);

      unmount();
    }
  });

  it('expected percent values for 5-ship fleet: 0→0%, 1→20%, 2→40%, 3→60%, 4→80%, 5→100%', () => {
    const expected = [
      { sunk: 0, percent: 0 },
      { sunk: 1, percent: 20 },
      { sunk: 2, percent: 40 },
      { sunk: 3, percent: 60 },
      { sunk: 4, percent: 80 },
      { sunk: 5, percent: 100 },
    ];

    let board = buildBoard();

    // Check 0 sunk
    const p0 = fleetProgress(board);
    expect(p0.sunk).toBe(0);
    expect(p0.percent).toBe(0);

    // Sink ships one by one
    for (let shipIdx = 0; shipIdx < sinkSequences.length; shipIdx++) {
      for (const coord of sinkSequences[shipIdx]) {
        const result = fireShot(board, coord);
        board = result.board;
      }
      const progress = fleetProgress(board);
      const exp = expected[shipIdx + 1];
      expect(progress.sunk).toBe(exp.sunk);
      expect(progress.percent).toBe(exp.percent);
    }
  });
});
