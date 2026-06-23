import type { Board, Coord, RNG } from './types';
import { BOARD_SIZE } from './types';
import { coordKey, shipCells } from './board';

export interface AIState {
  /** Coordinates of hits that haven't been fully resolved (ship not sunk yet). */
  targetQueue: Coord[];
}

export function createAIState(): AIState {
  return { targetQueue: [] };
}

function orthogonalNeighbors(c: Coord): Coord[] {
  return [
    { x: c.x - 1, y: c.y },
    { x: c.x + 1, y: c.y },
    { x: c.x, y: c.y - 1 },
    { x: c.x, y: c.y + 1 },
  ];
}

function inBounds(c: Coord): boolean {
  return c.x >= 0 && c.x < BOARD_SIZE && c.y >= 0 && c.y < BOARD_SIZE;
}

/**
 * Hunt/target AI.
 * Returns the next shot coord and updated AI state.
 * Pure — does not mutate inputs.
 */
export function aiChooseShot(
  board: Board,
  state: AIState,
  rng: RNG,
): { coord: Coord; aiState: AIState } {
  let queue = [...state.targetQueue];

  // Remove coords of sunk ships from the queue
  const sunkCells = new Set<string>();
  for (const ship of board.ships) {
    if (shipCells(ship).every((c) => board.shots.has(coordKey(c)))) {
      for (const c of shipCells(ship)) {
        sunkCells.add(coordKey(c));
      }
    }
  }
  queue = queue.filter((c) => !sunkCells.has(coordKey(c)));

  // Target mode: try neighbors of hits
  while (queue.length > 0) {
    const hit = queue[queue.length - 1];
    const neighbors = orthogonalNeighbors(hit);
    const untried = neighbors.filter(
      (n) => inBounds(n) && !board.shots.has(coordKey(n)),
    );
    if (untried.length > 0) {
      const idx = Math.floor(rng() * untried.length);
      return { coord: untried[idx], aiState: { targetQueue: queue } };
    }
    // All neighbors tried, pop this hit
    queue.pop();
  }

  // Hunt mode: pick random untried cell
  const untried: Coord[] = [];
  for (let x = 0; x < BOARD_SIZE; x++) {
    for (let y = 0; y < BOARD_SIZE; y++) {
      if (!board.shots.has(coordKey({ x, y }))) {
        untried.push({ x, y });
      }
    }
  }

  if (untried.length === 0) {
    throw new Error('No available cells to shoot');
  }

  const idx = Math.floor(rng() * untried.length);
  return { coord: untried[idx], aiState: { targetQueue: queue } };
}
