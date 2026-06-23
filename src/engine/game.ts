import type { GameState, Coord, FireShotResult } from './types';
import { FLEET } from './types';
import { createBoard, fireShot, fleetDefeated, placeFleetRandomly, placeShip } from './board';
import { aiChooseShot, createAIState } from './ai';
import type { AIState } from './ai';
import { mulberry32 } from './rng';

export interface FullGameState {
  game: GameState;
  aiState: AIState;
}

export function createGame(seed: number): FullGameState {
  const rng = mulberry32(seed);
  const aiBoard = placeFleetRandomly(FLEET, rng);
  return {
    game: {
      phase: 'setup',
      humanBoard: createBoard(),
      aiBoard,
      currentTurn: 'human',
      winner: null,
      seed,
    },
    aiState: createAIState(),
  };
}

export function placeHumanShip(
  state: FullGameState,
  ship: { origin: Coord; orientation: 'horizontal' | 'vertical'; length: number },
): FullGameState {
  if (state.game.phase !== 'setup') {
    throw new Error('Can only place ships during setup phase');
  }
  const newBoard = placeShip(state.game.humanBoard, ship);
  return {
    ...state,
    game: { ...state.game, humanBoard: newBoard },
  };
}

export function startGame(state: FullGameState): FullGameState {
  if (state.game.phase !== 'setup') {
    throw new Error('Can only start game from setup phase');
  }
  if (state.game.humanBoard.ships.length !== FLEET.length) {
    throw new Error(`Must place all ${FLEET.length} ships before starting`);
  }
  return {
    ...state,
    game: { ...state.game, phase: 'playing', currentTurn: 'human' },
  };
}

export function humanFire(
  state: FullGameState,
  coord: Coord,
): FullGameState {
  if (state.game.phase !== 'playing') {
    throw new Error('Can only fire during playing phase');
  }
  if (state.game.currentTurn !== 'human') {
    throw new Error("Not human's turn");
  }

  const result: FireShotResult = fireShot(state.game.aiBoard, coord);
  const newGame = { ...state.game, aiBoard: result.board };

  if (fleetDefeated(result.board)) {
    return {
      ...state,
      game: { ...newGame, phase: 'gameOver', winner: 'human' },
    };
  }

  return {
    ...state,
    game: { ...newGame, currentTurn: 'ai' },
  };
}

export function aiFire(state: FullGameState): FullGameState {
  if (state.game.phase !== 'playing') {
    throw new Error('Can only fire during playing phase');
  }
  if (state.game.currentTurn !== 'ai') {
    throw new Error("Not AI's turn");
  }

  const rng = mulberry32(state.game.seed);
  // Advance RNG past previous state — use shot count as simple advancement
  const totalShots = state.game.humanBoard.shots.size + state.game.aiBoard.shots.size;
  for (let i = 0; i < totalShots; i++) {
    rng();
  }

  const { coord, aiState: newAIState } = aiChooseShot(
    state.game.humanBoard,
    state.aiState,
    rng,
  );

  const result: FireShotResult = fireShot(state.game.humanBoard, coord);
  const newGame = { ...state.game, humanBoard: result.board };

  // If hit, add to target queue
  let updatedAIState = newAIState;
  if (result.result === 'hit') {
    updatedAIState = {
      targetQueue: [...newAIState.targetQueue, coord],
    };
  }

  if (fleetDefeated(result.board)) {
    return {
      game: { ...newGame, phase: 'gameOver', winner: 'ai' },
      aiState: updatedAIState,
    };
  }

  return {
    game: { ...newGame, currentTurn: 'human' },
    aiState: updatedAIState,
  };
}
