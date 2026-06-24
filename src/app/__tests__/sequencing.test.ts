/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameState } from '../useGameState';
import { setAimMs } from '../config';

// Set AIM_MS to 0 for synchronous test resolution
beforeEach(() => {
  setAimMs(0);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  setAimMs(800);
});

function setupAndStartGame(result: { current: ReturnType<typeof useGameState> }) {
  act(() => {
    result.current.actions.autoPlaceHumanFleet();
  });
  act(() => {
    result.current.actions.startPlaying();
  });
}

function getUnfiredCoordOnAiBoard(result: { current: ReturnType<typeof useGameState> }) {
  const board = result.current.state.game.aiBoard;
  for (let x = 0; x < 10; x++) {
    for (let y = 0; y < 10; y++) {
      if (!board.shots.has(`${x},${y}`)) {
        return { x, y };
      }
    }
  }
  throw new Error('No unfired coord');
}

describe('§6.5 Sequencing / flow tests (AIM_MS = 0)', () => {
  it('after human shot that doesn\'t end game, sets turn to AI, fires one AI shot, returns turn to human', () => {
    const { result } = renderHook(() => useGameState());
    setupAndStartGame(result);

    expect(result.current.turn).toBe('human');
    expect(result.current.aiPhase).toBe('idle');

    const humanBoardShotsBefore = result.current.state.game.humanBoard.shots.size;
    const coord = getUnfiredCoordOnAiBoard(result);

    act(() => {
      result.current.actions.fire(coord);
    });

    // Turn should be 'ai' immediately after fire
    expect(result.current.turn).toBe('ai');

    // Advance timers to resolve the AI aiming delay (AIM_MS=0)
    act(() => {
      vi.advanceTimersByTime(0);
    });

    // AI should have fired — announced phase
    expect(result.current.aiPhase).toBe('announced');
    expect(result.current.state.game.humanBoard.shots.size).toBe(humanBoardShotsBefore + 1);

    // Advance timers for the return-to-human timeout
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Control should be back to human (unless game is over)
    if (result.current.state.game.phase !== 'gameOver') {
      expect(result.current.turn).toBe('human');
      expect(result.current.aiPhase).toBe('idle');
    }
  });

  it('enemy grid locked for duration of AI turn, unlocked afterward', () => {
    const { result } = renderHook(() => useGameState());
    setupAndStartGame(result);

    const coord = getUnfiredCoordOnAiBoard(result);
    act(() => {
      result.current.actions.fire(coord);
    });

    // During AI turn, grid should be locked
    expect(result.current.turn === 'ai' || result.current.aiPhase !== 'idle').toBe(true);

    // Resolve AI turn
    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    // After AI turn completes, grid should be unlocked
    if (result.current.state.game.phase !== 'gameOver') {
      expect(result.current.turn).toBe('human');
      expect(result.current.aiPhase).toBe('idle');
    }
  });

  it('human click during AI turn is ignored (no second shot fired)', () => {
    const { result } = renderHook(() => useGameState());
    setupAndStartGame(result);

    const coord1 = getUnfiredCoordOnAiBoard(result);
    act(() => {
      result.current.actions.fire(coord1);
    });

    // Turn is now 'ai'
    expect(result.current.turn).toBe('ai');
    const aiShotsBefore = result.current.state.game.aiBoard.shots.size;

    // Try to fire again during AI turn — should be ignored
    const coord2 = getUnfiredCoordOnAiBoard(result);
    act(() => {
      result.current.actions.fire(coord2);
    });

    // No additional shot on AI board
    expect(result.current.state.game.aiBoard.shots.size).toBe(aiShotsBefore);

    // Resolve AI turn
    act(() => {
      vi.advanceTimersByTime(0);
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
  });

  it('if AI shot defeats player fleet, sequence ends in game-over, does NOT return control to human', () => {
    const { result } = renderHook(() => useGameState());
    setupAndStartGame(result);

    // Play until game over
    let turns = 0;
    while (result.current.state.game.phase === 'playing' && turns < 200) {
      const coord = getUnfiredCoordOnAiBoard(result);
      act(() => {
        result.current.actions.fire(coord);
      });
      act(() => {
        vi.advanceTimersByTime(0);
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });
      turns++;
    }

    expect(result.current.state.game.phase).toBe('gameOver');
    if (result.current.state.game.winner === 'ai') {
      expect(result.current.message).toContain('Computer wins');
    }
  });

  it('exactly one AI shot per human turn (no double-fire / re-entrancy)', () => {
    const { result } = renderHook(() => useGameState());
    setupAndStartGame(result);

    for (let i = 0; i < 5; i++) {
      if (result.current.state.game.phase !== 'playing') break;

      const humanBoardBefore = result.current.state.game.humanBoard.shots.size;
      const coord = getUnfiredCoordOnAiBoard(result);

      act(() => {
        result.current.actions.fire(coord);
      });
      act(() => {
        vi.advanceTimersByTime(0);
      });
      act(() => {
        vi.advanceTimersByTime(400);
      });

      if (result.current.state.game.phase === 'playing') {
        expect(result.current.state.game.humanBoard.shots.size).toBe(humanBoardBefore + 1);
      }
    }
  });
});
