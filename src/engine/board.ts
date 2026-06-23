import type { Board, Coord, Ship, FireShotResult, RNG } from './types';
import { BOARD_SIZE } from './types';

export function coordKey(c: Coord): string {
  return `${c.x},${c.y}`;
}

export function parseCoordKey(key: string): Coord {
  const [x, y] = key.split(',').map(Number);
  return { x, y };
}

export function createBoard(): Board {
  return { ships: [], shots: new Set() };
}

/** Return every cell a ship occupies. */
export function shipCells(ship: Ship): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push({
      x: ship.origin.x + (ship.orientation === 'horizontal' ? i : 0),
      y: ship.origin.y + (ship.orientation === 'vertical' ? i : 0),
    });
  }
  return cells;
}

function inBounds(c: Coord): boolean {
  return c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE;
}

/** Pure — returns a new board with the ship added, or throws on illegal placement. */
export function placeShip(board: Board, ship: Ship): Board {
  const cells = shipCells(ship);

  // Check bounds
  if (!cells.every(inBounds)) {
    throw new Error('Ship out of bounds');
  }

  // Check overlap with existing ships
  const occupied = new Set<string>();
  for (const s of board.ships) {
    for (const c of shipCells(s)) {
      occupied.add(coordKey(c));
    }
  }
  for (const c of cells) {
    if (occupied.has(coordKey(c))) {
      throw new Error('Ship overlaps another ship');
    }
  }

  return { ...board, ships: [...board.ships, ship] };
}

/** Pure — returns a new board + shot result. Throws on duplicate shot. */
export function fireShot(board: Board, coord: Coord): FireShotResult {
  if (!inBounds(coord)) {
    throw new Error('Shot out of bounds');
  }

  const key = coordKey(coord);
  if (board.shots.has(key)) {
    throw new Error('Duplicate shot');
  }

  const newShots = new Set(board.shots);
  newShots.add(key);
  const newBoard: Board = { ...board, shots: newShots };

  // Check if hit
  for (const ship of newBoard.ships) {
    const cells = shipCells(ship);
    if (cells.some((c) => coordKey(c) === key)) {
      // Hit — check if sunk
      if (isSunk(newBoard, ship)) {
        return { board: newBoard, result: 'sunk', sunkShip: ship };
      }
      return { board: newBoard, result: 'hit', sunkShip: null };
    }
  }
  return { board: newBoard, result: 'miss', sunkShip: null };
}

/** Derive whether a ship is sunk (all cells hit). */
export function isSunk(board: Board, ship: Ship): boolean {
  return shipCells(ship).every((c) => board.shots.has(coordKey(c)));
}

/** Derive whether the entire fleet is defeated. */
export function fleetDefeated(board: Board): boolean {
  return board.ships.length > 0 && board.ships.every((s) => isSunk(board, s));
}

export type CellState = 'empty' | 'ship' | 'miss' | 'hit' | 'sunk';

/** Derive visual state of a cell. showShips=false hides un-hit ships (opponent view). */
export function getCellState(
  board: Board,
  coord: Coord,
  showShips: boolean,
): CellState {
  const key = coordKey(coord);
  const wasShot = board.shots.has(key);

  for (const ship of board.ships) {
    const cells = shipCells(ship);
    if (cells.some((c) => coordKey(c) === key)) {
      if (wasShot) {
        return isSunk(board, ship) ? 'sunk' : 'hit';
      }
      return showShips ? 'ship' : 'empty';
    }
  }

  return wasShot ? 'miss' : 'empty';
}

/** Place all ships from `lengths` randomly on an empty board. */
export function placeFleetRandomly(
  lengths: readonly number[],
  rng: RNG,
): Board {
  let board = createBoard();
  for (const length of lengths) {
    let placed = false;
    for (let attempt = 0; attempt < 1000; attempt++) {
      const orientation = rng() < 0.5 ? 'horizontal' : 'vertical' as const;
      const maxX = orientation === 'horizontal' ? BOARD_SIZE - length : BOARD_SIZE - 1;
      const maxY = orientation === 'vertical' ? BOARD_SIZE - length : BOARD_SIZE - 1;
      const x = Math.floor(rng() * (maxX + 1));
      const y = Math.floor(rng() * (maxY + 1));
      try {
        board = placeShip(board, { origin: { x, y }, orientation, length });
        placed = true;
        break;
      } catch {
        // Retry
      }
    }
    if (!placed) {
      throw new Error('Could not place fleet after 1000 attempts');
    }
  }
  return board;
}
