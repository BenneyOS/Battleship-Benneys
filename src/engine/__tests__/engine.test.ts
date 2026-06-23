import { describe, it, expect } from 'vitest';
import {
  createBoard,
  placeShip,
  fireShot,
  isSunk,
  fleetDefeated,
  getCellState,
  shipCells,
  coordKey,
  placeFleetRandomly,
} from '../board';
import { mulberry32 } from '../rng';
import { aiChooseShot, createAIState } from '../ai';
import {
  createGame,
  placeHumanShip,
  startGame,
  humanFire,
  aiFire,
} from '../game';
import type { Board, Ship, Coord } from '../types';
import { BOARD_SIZE, FLEET } from '../types';

// ─── RNG ────────────────────────────────────────────────────────────────────

describe('mulberry32 RNG', () => {
  it('produces deterministic sequences', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('different seeds produce different sequences', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    let allSame = true;
    for (let i = 0; i < 10; i++) {
      if (a() !== b()) allSame = false;
    }
    expect(allSame).toBe(false);
  });
});

// ─── Board / Ship Placement ──────────────────────────────────────────────

describe('placeShip', () => {
  it('places a ship on an empty board', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 };
    const newBoard = placeShip(board, ship);
    expect(newBoard.ships).toHaveLength(1);
    expect(newBoard.ships[0]).toEqual(ship);
  });

  it('returns a new board (immutability)', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 };
    const newBoard = placeShip(board, ship);
    expect(newBoard).not.toBe(board);
    expect(board.ships).toHaveLength(0);
  });

  it('rejects ship extending past right edge', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 8, y: 0 }, orientation: 'horizontal', length: 5 };
    expect(() => placeShip(board, ship)).toThrow('Ship out of bounds');
  });

  it('rejects ship extending past bottom edge', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 0, y: 9 }, orientation: 'vertical', length: 3 };
    expect(() => placeShip(board, ship)).toThrow('Ship out of bounds');
  });

  it('rejects ship with negative origin', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: -1, y: 0 }, orientation: 'horizontal', length: 3 };
    expect(() => placeShip(board, ship)).toThrow('Ship out of bounds');
  });

  it('rejects overlapping ships', () => {
    const board = createBoard();
    const ship1: Ship = { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 };
    const board2 = placeShip(board, ship1);
    const ship2: Ship = { origin: { x: 2, y: 0 }, orientation: 'vertical', length: 3 };
    expect(() => placeShip(board2, ship2)).toThrow('Ship overlaps');
  });

  it('allows non-overlapping ships', () => {
    const board = createBoard();
    const ship1: Ship = { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 };
    const board2 = placeShip(board, ship1);
    const ship2: Ship = { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 3 };
    const board3 = placeShip(board2, ship2);
    expect(board3.ships).toHaveLength(2);
  });

  it('allows ship at max valid position (horizontal)', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 7, y: 9 }, orientation: 'horizontal', length: 3 };
    const newBoard = placeShip(board, ship);
    expect(newBoard.ships).toHaveLength(1);
  });

  it('allows ship at max valid position (vertical)', () => {
    const board = createBoard();
    const ship: Ship = { origin: { x: 9, y: 7 }, orientation: 'vertical', length: 3 };
    const newBoard = placeShip(board, ship);
    expect(newBoard.ships).toHaveLength(1);
  });
});

// ─── fireShot ───────────────────────────────────────────────────────────

describe('fireShot', () => {
  const shipOnBoard = (): Board => {
    const board = createBoard();
    return placeShip(board, {
      origin: { x: 0, y: 0 },
      orientation: 'horizontal',
      length: 3,
    });
  };

  it('records a miss', () => {
    const board = shipOnBoard();
    const { board: newBoard, result } = fireShot(board, { x: 5, y: 5 });
    expect(result).toBe('miss');
    expect(newBoard.shots.has('5,5')).toBe(true);
  });

  it('records a hit', () => {
    const board = shipOnBoard();
    const { board: newBoard, result } = fireShot(board, { x: 0, y: 0 });
    expect(result).toBe('hit');
    expect(newBoard.shots.has('0,0')).toBe(true);
  });

  it('records a sunk when all cells hit', () => {
    let board = shipOnBoard();
    board = fireShot(board, { x: 0, y: 0 }).board;
    board = fireShot(board, { x: 1, y: 0 }).board;
    const { result, sunkShip } = fireShot(board, { x: 2, y: 0 });
    expect(result).toBe('sunk');
    expect(sunkShip).toEqual({
      origin: { x: 0, y: 0 },
      orientation: 'horizontal',
      length: 3,
    });
  });

  it('returns a new board (immutability)', () => {
    const board = shipOnBoard();
    const { board: newBoard } = fireShot(board, { x: 5, y: 5 });
    expect(newBoard).not.toBe(board);
    expect(board.shots.size).toBe(0);
    expect(newBoard.shots.size).toBe(1);
  });

  it('rejects duplicate shots', () => {
    const board = shipOnBoard();
    const { board: newBoard } = fireShot(board, { x: 5, y: 5 });
    expect(() => fireShot(newBoard, { x: 5, y: 5 })).toThrow('Duplicate shot');
  });

  it('rejects out-of-bounds shots', () => {
    const board = shipOnBoard();
    expect(() => fireShot(board, { x: -1, y: 0 })).toThrow('Shot out of bounds');
    expect(() => fireShot(board, { x: 0, y: 10 })).toThrow('Shot out of bounds');
    expect(() => fireShot(board, { x: 10, y: 0 })).toThrow('Shot out of bounds');
  });
});

// ─── Derived State ──────────────────────────────────────────────────────

describe('isSunk', () => {
  it('returns false when ship not fully hit', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 });
    board = fireShot(board, { x: 0, y: 0 }).board;
    expect(isSunk(board, board.ships[0])).toBe(false);
  });

  it('returns true when all cells hit', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 });
    board = fireShot(board, { x: 0, y: 0 }).board;
    board = fireShot(board, { x: 1, y: 0 }).board;
    board = fireShot(board, { x: 2, y: 0 }).board;
    expect(isSunk(board, board.ships[0])).toBe(true);
  });
});

describe('fleetDefeated', () => {
  it('returns false when not all ships sunk', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 3 });
    board = fireShot(board, { x: 0, y: 0 }).board;
    board = fireShot(board, { x: 1, y: 0 }).board;
    expect(fleetDefeated(board)).toBe(false);
  });

  it('returns true only when final cell of final ship is hit', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 });
    board = placeShip(board, { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 2 });

    // Sink first ship
    board = fireShot(board, { x: 0, y: 0 }).board;
    board = fireShot(board, { x: 1, y: 0 }).board;
    expect(fleetDefeated(board)).toBe(false);

    // Hit one cell of second ship
    board = fireShot(board, { x: 0, y: 1 }).board;
    expect(fleetDefeated(board)).toBe(false);

    // Sink second ship — now fleet is defeated
    board = fireShot(board, { x: 1, y: 1 }).board;
    expect(fleetDefeated(board)).toBe(true);
  });

  it('returns false on empty board', () => {
    expect(fleetDefeated(createBoard())).toBe(false);
  });
});

describe('getCellState', () => {
  it('returns "empty" for untouched cells', () => {
    const board = createBoard();
    expect(getCellState(board, { x: 0, y: 0 }, true)).toBe('empty');
  });

  it('returns "ship" when showShips is true and cell has unhit ship', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 });
    expect(getCellState(board, { x: 0, y: 0 }, true)).toBe('ship');
  });

  it('returns "empty" when showShips is false and cell has unhit ship', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 });
    expect(getCellState(board, { x: 0, y: 0 }, false)).toBe('empty');
  });

  it('returns "miss" for shot on empty cell', () => {
    let board = createBoard();
    board = fireShot(board, { x: 5, y: 5 }).board;
    expect(getCellState(board, { x: 5, y: 5 }, true)).toBe('miss');
  });

  it('returns "hit" for shot on ship cell (not sunk)', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 3 });
    board = fireShot(board, { x: 0, y: 0 }).board;
    expect(getCellState(board, { x: 0, y: 0 }, true)).toBe('hit');
  });

  it('returns "sunk" for all cells of a sunk ship', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 2 });
    board = fireShot(board, { x: 0, y: 0 }).board;
    board = fireShot(board, { x: 1, y: 0 }).board;
    expect(getCellState(board, { x: 0, y: 0 }, true)).toBe('sunk');
    expect(getCellState(board, { x: 1, y: 0 }, true)).toBe('sunk');
  });
});

// ─── shipCells ──────────────────────────────────────────────────────────

describe('shipCells', () => {
  it('computes horizontal ship cells correctly', () => {
    const cells = shipCells({ origin: { x: 2, y: 3 }, orientation: 'horizontal', length: 4 });
    expect(cells).toEqual([
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
    ]);
  });

  it('computes vertical ship cells correctly', () => {
    const cells = shipCells({ origin: { x: 2, y: 3 }, orientation: 'vertical', length: 3 });
    expect(cells).toEqual([
      { x: 2, y: 3 },
      { x: 2, y: 4 },
      { x: 2, y: 5 },
    ]);
  });
});

// ─── Random Fleet Placement ──────────────────────────────────────────────

describe('placeFleetRandomly', () => {
  it('places the correct number of ships', () => {
    const rng = mulberry32(42);
    const board = placeFleetRandomly(FLEET, rng);
    expect(board.ships).toHaveLength(FLEET.length);
  });

  it('all ships are in bounds', () => {
    const rng = mulberry32(42);
    const board = placeFleetRandomly(FLEET, rng);
    for (const ship of board.ships) {
      for (const c of shipCells(ship)) {
        expect(c.x).toBeGreaterThanOrEqual(0);
        expect(c.x).toBeLessThan(BOARD_SIZE);
        expect(c.y).toBeGreaterThanOrEqual(0);
        expect(c.y).toBeLessThan(BOARD_SIZE);
      }
    }
  });

  it('no ships overlap', () => {
    const rng = mulberry32(42);
    const board = placeFleetRandomly(FLEET, rng);
    const allCells = new Set<string>();
    for (const ship of board.ships) {
      for (const c of shipCells(ship)) {
        const key = coordKey(c);
        expect(allCells.has(key)).toBe(false);
        allCells.add(key);
      }
    }
  });

  it('is deterministic with same seed', () => {
    const a = placeFleetRandomly(FLEET, mulberry32(123));
    const b = placeFleetRandomly(FLEET, mulberry32(123));
    expect(a.ships).toEqual(b.ships);
  });
});

// ─── AI ─────────────────────────────────────────────────────────────────

describe('AI', () => {
  it('never repeats a shot', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 });
    let aiState = createAIState();
    const shots = new Set<string>();

    for (let i = 0; i < 100; i++) {
      const { coord, aiState: newState } = aiChooseShot(board, aiState, mulberry32(42 + i));
      const key = coordKey(coord);
      expect(shots.has(key)).toBe(false);
      shots.add(key);

      const result = fireShot(board, coord);
      board = result.board;
      if (result.result === 'hit') {
        aiState = { targetQueue: [...newState.targetQueue, coord] };
      } else {
        aiState = newState;
      }
    }
  });

  it('targets neighbors after a hit', () => {
    let board = createBoard();
    board = placeShip(board, { origin: { x: 5, y: 5 }, orientation: 'horizontal', length: 3 });

    // Fire a hit at 5,5
    const result = fireShot(board, { x: 5, y: 5 });
    board = result.board;
    const aiState = { targetQueue: [{ x: 5, y: 5 }] };

    // AI should target a neighbor of 5,5
    const { coord } = aiChooseShot(board, aiState, mulberry32(1));
    const neighbors = [
      coordKey({ x: 4, y: 5 }),
      coordKey({ x: 6, y: 5 }),
      coordKey({ x: 5, y: 4 }),
      coordKey({ x: 5, y: 6 }),
    ];
    expect(neighbors).toContain(coordKey(coord));
  });
});

// ─── Phase / Turn Guards ────────────────────────────────────────────────

describe('phase and turn guards', () => {
  it('rejects placing ships during playing phase', () => {
    let state = createGame(42);
    // Place all 5 ships
    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);
    expect(() =>
      placeHumanShip(state, {
        origin: { x: 0, y: 5 },
        orientation: 'horizontal',
        length: 2,
      }),
    ).toThrow('setup');
  });

  it('rejects starting game without all ships placed', () => {
    const state = createGame(42);
    expect(() => startGame(state)).toThrow('Must place all');
  });

  it('rejects human firing during setup', () => {
    const state = createGame(42);
    expect(() => humanFire(state, { x: 0, y: 0 })).toThrow('playing');
  });

  it("rejects human firing on AI's turn", () => {
    let state = createGame(42);
    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);
    // Fire once to switch to AI turn
    state = humanFire(state, { x: 0, y: 0 });
    if (state.game.currentTurn === 'ai') {
      expect(() => humanFire(state, { x: 1, y: 0 })).toThrow("Not human's turn");
    }
  });

  it("rejects AI firing on human's turn", () => {
    let state = createGame(42);
    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);
    // It's human's turn
    expect(() => aiFire(state)).toThrow("Not AI's turn");
  });

  it('rejects firing after game over', () => {
    let state = createGame(42);
    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);

    // Force game over by setting phase
    const gameOverState = {
      ...state,
      game: { ...state.game, phase: 'gameOver' as const, winner: 'human' as const },
    };
    expect(() => humanFire(gameOverState, { x: 0, y: 0 })).toThrow('playing');
    expect(() => aiFire(gameOverState)).toThrow('playing');
  });
});

// ─── Full Scripted Game ─────────────────────────────────────────────────

describe('full scripted game', () => {
  it('ends with exactly one winner', () => {
    let state = createGame(42);

    // Place human ships
    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);

    // Collect all AI ship cells so human can sink them
    const aiCells: Coord[] = [];
    for (const ship of state.game.aiBoard.ships) {
      aiCells.push(...shipCells(ship));
    }

    let humanShotIdx = 0;
    const humanMisses: Coord[] = [];
    // Prepare miss targets (cells not occupied by AI ships)
    const aiOccupied = new Set(aiCells.map(coordKey));
    for (let x = 0; x < BOARD_SIZE; x++) {
      for (let y = 0; y < BOARD_SIZE; y++) {
        if (!aiOccupied.has(coordKey({ x, y }))) {
          humanMisses.push({ x, y });
        }
      }
    }

    let turnCount = 0;
    const MAX_TURNS = 200;

    while (state.game.phase === 'playing' && turnCount < MAX_TURNS) {
      if (state.game.currentTurn === 'human') {
        // Fire at AI ship cells first, then misses
        let target: Coord;
        if (humanShotIdx < aiCells.length) {
          target = aiCells[humanShotIdx];
          humanShotIdx++;
        } else {
          target = humanMisses.shift()!;
        }
        state = humanFire(state, target);
      } else {
        state = aiFire(state);
      }
      turnCount++;
    }

    expect(state.game.phase).toBe('gameOver');
    expect(state.game.winner).not.toBeNull();
    expect(['human', 'ai']).toContain(state.game.winner);
  });

  it('human wins by sinking all AI ships', () => {
    let state = createGame(99);

    const placements: Ship[] = [
      { origin: { x: 0, y: 0 }, orientation: 'horizontal', length: 5 },
      { origin: { x: 0, y: 1 }, orientation: 'horizontal', length: 4 },
      { origin: { x: 0, y: 2 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 3 }, orientation: 'horizontal', length: 3 },
      { origin: { x: 0, y: 4 }, orientation: 'horizontal', length: 2 },
    ];
    for (const ship of placements) {
      state = placeHumanShip(state, ship);
    }
    state = startGame(state);

    // Target all AI ship cells
    const aiCells: Coord[] = [];
    for (const ship of state.game.aiBoard.ships) {
      aiCells.push(...shipCells(ship));
    }

    let idx = 0;
    while (state.game.phase === 'playing') {
      if (state.game.currentTurn === 'human') {
        state = humanFire(state, aiCells[idx]);
        idx++;
      } else {
        state = aiFire(state);
      }
    }

    expect(state.game.phase).toBe('gameOver');
    expect(state.game.winner).toBe('human');
  });
});
