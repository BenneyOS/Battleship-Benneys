export interface Coord {
  x: number;
  y: number;
}

export type Orientation = 'horizontal' | 'vertical';

export interface Ship {
  origin: Coord;
  orientation: Orientation;
  length: number;
}

export interface Board {
  ships: readonly Ship[];
  shots: ReadonlySet<string>;
}

export type Phase = 'setup' | 'playing' | 'gameOver';
export type Player = 'human' | 'ai';

export interface GameState {
  phase: Phase;
  humanBoard: Board;
  aiBoard: Board;
  currentTurn: Player;
  winner: Player | null;
  seed: number;
}

export type ShotResult = 'miss' | 'hit' | 'sunk';

export interface FireShotResult {
  board: Board;
  result: ShotResult;
  sunkShip: Ship | null;
}

export const BOARD_SIZE = 10;
export const FLEET: readonly number[] = [5, 4, 3, 3, 2];

export type RNG = () => number;
