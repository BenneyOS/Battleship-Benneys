import { useState, useCallback, useRef } from 'react';
import type { Coord, Ship } from '../engine/types';
import { FLEET } from '../engine/types';
import { placeFleetRandomly, fireShot, fleetDefeated } from '../engine/board';
import { mulberry32 } from '../engine/rng';
import { aiChooseShot } from '../engine/ai';
import type { AIState } from '../engine/ai';
import {
  createGame,
  placeHumanShip,
  startGame,
  humanFire,
} from '../engine/game';
import type { FullGameState } from '../engine/game';
import { AIM_MS } from './config';
import { formatMove, fleetProgress, milestoneFor } from '../engine/selectors';
import type { ShotOutcome } from '../engine/selectors';
import type { LastShotEvent } from '../ui/headerStatus';

export type Turn = 'human' | 'ai';
export type AiPhase = 'idle' | 'aiming' | 'announced';

export const SHIP_NAMES = ['Carrier', 'Battleship', 'Cruiser', 'Submarine', 'Destroyer'];

export function useGameState() {
  const [state, setState] = useState<FullGameState>(() =>
    createGame(Date.now()),
  );
  const [message, setMessage] = useState(`Place your ${FLEET[0]}-cell ship. Press R to rotate.`);
  const [placementIndex, setPlacementIndex] = useState(0);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  // Turn orchestration — single source of truth for UI
  const [turn, setTurn] = useState<Turn>('human');
  const [aiPhase, setAiPhase] = useState<AiPhase>('idle');
  const [aiAnnouncement, setAiAnnouncement] = useState<string | null>(null);
  const [highlightedCell, setHighlightedCell] = useState<Coord | null>(null);

  // Milestone tracking (persists across renders, resets on new game)
  const [crossedMilestones, setCrossedMilestones] = useState<Set<number>>(new Set());
  const [milestoneMessage, setMilestoneMessage] = useState<string | null>(null);

  // Last shot event — shared by header banner + event line + side panel
  const [lastShotResult, setLastShotResult] = useState<LastShotEvent | null>(null);
  const [turnCount, setTurnCount] = useState(0);

  // Guard against re-entrancy
  const aiTurnInProgress = useRef(false);

  const currentShipLength = placementIndex < FLEET.length ? FLEET[placementIndex] : null;

  const placeShipAction = useCallback(
    (ship: Ship) => {
      try {
        const newState = placeHumanShip(state, ship);
        setState(newState);
        const nextIdx = placementIndex + 1;
        setPlacementIndex(nextIdx);
        if (nextIdx >= FLEET.length) {
          setMessage('All ships placed! Click "Start Battle" to begin.');
        } else {
          setMessage(`Place your ${FLEET[nextIdx]}-cell ship. Press R to rotate.`);
        }
      } catch (e: unknown) {
        setMessage(`Invalid placement: ${(e as Error).message}`);
      }
    },
    [state, placementIndex],
  );

  const startPlaying = useCallback(() => {
    try {
      const newState = startGame(state);
      setState(newState);
      setTurn('human');
      setAiPhase('idle');
      setMessage('Your turn \u2014 fire at the enemy grid.');
    } catch (e: unknown) {
      setMessage((e as Error).message);
    }
  }, [state]);

  const fire = useCallback(
    (coord: Coord) => {
      // Guard: ignore clicks during AI turn
      if (turn !== 'human' || aiPhase !== 'idle') return;
      // Guard: re-entrancy
      if (aiTurnInProgress.current) return;

      try {
        // Human fires
        const newState = humanFire(state, coord);

        if (newState.game.phase === 'gameOver') {
          setState(newState);
          setMessage('You win! All enemy ships sunk!');
          // The winning shot must be a sunk — find the ship
          const winShips = newState.game.aiBoard.ships;
          let winShipName: string | undefined;
          for (let si = 0; si < winShips.length; si++) {
            const ship = winShips[si];
            const cells = Array.from({ length: ship.length }, (_, i) =>
              ship.orientation === 'horizontal'
                ? { x: ship.origin.x + i, y: ship.origin.y }
                : { x: ship.origin.x, y: ship.origin.y + i }
            );
            if (cells.some((c) => c.x === coord.x && c.y === coord.y)) {
              winShipName = SHIP_NAMES[si] ?? undefined;
              break;
            }
          }
          setLastShotResult({
            actor: 'human',
            coord,
            outcome: 'sunk',
            sunkShipName: winShipName,
          });
          // Check milestone for human winning (keyed to sunk count)
          const progress = fleetProgress(newState.game.aiBoard);
          const m = milestoneFor(progress.sunk);
          if (m !== null && !crossedMilestones.has(m)) {
            setCrossedMilestones((prev) => new Set([...prev, m]));
            setMilestoneMessage(getMilestoneText(m));
          }
          return;
        }

        setState(newState);

        // Track human shot result for the header event line
        const humanResult = newState.game.aiBoard.shots.has(`${coord.x},${coord.y}`)
          ? (() => {
              // Determine outcome from the board diff
              const ships = newState.game.aiBoard.ships;
              for (const ship of ships) {
                const cells = Array.from({ length: ship.length }, (_, i) =>
                  ship.orientation === 'horizontal'
                    ? { x: ship.origin.x + i, y: ship.origin.y }
                    : { x: ship.origin.x, y: ship.origin.y + i }
                );
                if (cells.some((c) => c.x === coord.x && c.y === coord.y)) {
                  const allHit = cells.every((c) => newState.game.aiBoard.shots.has(`${c.x},${c.y}`));
                  if (allHit) {
                    const shipIdx = ships.indexOf(ship);
                    return {
                      outcome: 'sunk' as ShotOutcome,
                      sunkShipName: shipIdx >= 0 ? SHIP_NAMES[shipIdx] : undefined,
                    };
                  }
                  return { outcome: 'hit' as ShotOutcome };
                }
              }
              return { outcome: 'miss' as ShotOutcome };
            })()
          : { outcome: 'miss' as ShotOutcome };
        setLastShotResult({
          actor: 'human',
          coord,
          outcome: humanResult.outcome,
          sunkShipName: humanResult.sunkShipName,
        });

        // Check milestone after human shot (keyed to sunk count)
        const progress = fleetProgress(newState.game.aiBoard);
        const m = milestoneFor(progress.sunk);
        if (m !== null && !crossedMilestones.has(m)) {
          setCrossedMilestones((prev) => new Set([...prev, m]));
          setMilestoneMessage(getMilestoneText(m));
        }

        // --- Begin AI turn sequence ---
        setTurn('ai');
        setAiPhase('aiming');
        setMessage('Computer is taking aim\u2026');
        setAiAnnouncement(null);
        setHighlightedCell(null);
        aiTurnInProgress.current = true;

        const executeAiTurn = (currentState: FullGameState) => {
          // Compute AI shot using engine primitives directly
          const rng = mulberry32(currentState.game.seed);
          const totalShots =
            currentState.game.humanBoard.shots.size + currentState.game.aiBoard.shots.size;
          for (let i = 0; i < totalShots; i++) {
            rng();
          }

          const { coord: aiCoord, aiState: newAIState } = aiChooseShot(
            currentState.game.humanBoard,
            currentState.aiState,
            rng,
          );

          const shotResult = fireShot(currentState.game.humanBoard, aiCoord);
          const newHumanBoard = shotResult.board;
          const result = shotResult.result;

          // Determine sunk ship name
          let sunkShipName: string | undefined;
          if (result === 'sunk' && shotResult.sunkShip) {
            const shipIdx = currentState.game.humanBoard.ships.findIndex(
              (s) =>
                s.origin.x === shotResult.sunkShip!.origin.x &&
                s.origin.y === shotResult.sunkShip!.origin.y &&
                s.length === shotResult.sunkShip!.length,
            );
            sunkShipName = shipIdx >= 0 ? SHIP_NAMES[shipIdx] : `${shotResult.sunkShip.length}-cell ship`;
          }

          // Update AI state (target queue)
          let updatedAIState: AIState = newAIState;
          if (result === 'hit') {
            updatedAIState = { targetQueue: [...newAIState.targetQueue, aiCoord] };
          }

          // Build new game state
          const defeated = fleetDefeated(newHumanBoard);
          const updatedGame = {
            ...currentState.game,
            humanBoard: newHumanBoard,
            currentTurn: defeated ? currentState.game.currentTurn : ('human' as const),
            phase: defeated ? ('gameOver' as const) : currentState.game.phase,
            winner: defeated ? ('ai' as const) : currentState.game.winner,
          };

          const finalState: FullGameState = {
            game: updatedGame,
            aiState: updatedAIState,
          };

          // Announce and highlight
          const outcome: ShotOutcome = result;
          const announcement = formatMove(aiCoord, outcome, sunkShipName);

          setAiPhase('announced');
          setHighlightedCell(aiCoord);
          setAiAnnouncement(announcement);
          setLastShotResult({
            actor: 'computer',
            coord: aiCoord,
            outcome,
            sunkShipName,
          });
          setState(finalState);

          if (defeated) {
            setMessage('Computer wins! Your fleet has been sunk.');
            aiTurnInProgress.current = false;
            return;
          }

          // Return control to human after brief display
          setTimeout(() => {
            setTurn('human');
            setAiPhase('idle');
            setHighlightedCell(null);
            setMessage('Your turn \u2014 fire at the enemy grid.');
            setTurnCount((c) => c + 1);
            aiTurnInProgress.current = false;
          }, Math.min(AIM_MS, 400));
        };

        // Aiming delay
        setTimeout(() => executeAiTurn(newState), AIM_MS);
      } catch (e: unknown) {
        setMessage(`${(e as Error).message}`);
      }
    },
    [state, turn, aiPhase, crossedMilestones],
  );

  const reset = useCallback(() => {
    setState(createGame(Date.now()));
    setPlacementIndex(0);
    setOrientation('horizontal');
    setMessage(`Place your ${FLEET[0]}-cell ship. Press R to rotate.`);
    setTurn('human');
    setAiPhase('idle');
    setAiAnnouncement(null);
    setHighlightedCell(null);
    setCrossedMilestones(new Set());
    setMilestoneMessage(null);
    setLastShotResult(null);
    setTurnCount(0);
    aiTurnInProgress.current = false;
  }, []);

  const autoPlaceHumanFleet = useCallback(() => {
    try {
      const rng = mulberry32(Date.now());
      const autoBoard = placeFleetRandomly(FLEET, rng);
      const freshState = createGame(state.game.seed);
      let buildState: FullGameState = {
        ...freshState,
        game: { ...freshState.game, aiBoard: state.game.aiBoard },
      };
      for (const ship of autoBoard.ships) {
        buildState = placeHumanShip(buildState, ship);
      }
      setState(buildState);
      setPlacementIndex(FLEET.length);
      setMessage('Ships auto-placed! Click "Start Battle" to begin.');
    } catch {
      setMessage('Auto-placement failed, try again.');
    }
  }, [state]);

  return {
    state,
    message,
    placementIndex,
    orientation,
    setOrientation,
    currentShipLength,
    turn,
    aiPhase,
    aiAnnouncement,
    highlightedCell,
    milestoneMessage,
    crossedMilestones,
    lastShotResult,
    turnCount,
    actions: {
      placeShip: placeShipAction,
      startPlaying,
      fire,
      reset,
      autoPlaceHumanFleet,
    },
  };
}

function getMilestoneText(sunkCount: number): string {
  switch (sunkCount) {
    case 3:
      return 'Over halfway \u2014 3 of 5 ships down!';
    case 4:
      return 'One to go \u2014 4 of 5 ships sunk!';
    default:
      return '';
  }
}
