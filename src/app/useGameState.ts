import { useState, useCallback } from 'react';
import type { Coord, Ship } from '../engine/types';
import { FLEET } from '../engine/types';
import { placeFleetRandomly } from '../engine/board';
import { mulberry32 } from '../engine/rng';
import {
  createGame,
  placeHumanShip,
  startGame,
  humanFire,
  aiFire,
} from '../engine/game';
import type { FullGameState } from '../engine/game';

export function useGameState() {
  const [state, setState] = useState<FullGameState>(() =>
    createGame(Date.now()),
  );
  const [message, setMessage] = useState(`Place your ${FLEET[0]}-cell ship. Press R to rotate.`);
  const [placementIndex, setPlacementIndex] = useState(0);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');

  const currentShipLength = placementIndex < FLEET.length ? FLEET[placementIndex] : null;

  const placeShipAction = useCallback(
    (ship: Ship) => {
      try {
        const newState = placeHumanShip(state, ship);
        setState(newState);
        const nextIdx = placementIndex + 1;
        setPlacementIndex(nextIdx);
        if (nextIdx >= FLEET.length) {
          setMessage('All ships placed! Click "Start Game" to begin.');
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
      setMessage('Game on! Click on the enemy board to fire.');
    } catch (e: unknown) {
      setMessage((e as Error).message);
    }
  }, [state]);

  const fire = useCallback(
    (coord: Coord) => {
      try {
        let newState = humanFire(state, coord);
        if (newState.game.phase === 'gameOver') {
          setState(newState);
          setMessage('You win! All enemy ships sunk!');
          return;
        }
        // AI fires back
        newState = aiFire(newState);
        if (newState.game.phase === 'gameOver') {
          setState(newState);
          setMessage('AI wins! Your fleet has been sunk.');
          return;
        }
        setState(newState);
        setMessage('Your turn -- fire at the enemy board.');
      } catch (e: unknown) {
        setMessage(`${(e as Error).message}`);
      }
    },
    [state],
  );

  const reset = useCallback(() => {
    setState(createGame(Date.now()));
    setPlacementIndex(0);
    setOrientation('horizontal');
    setMessage(`Place your ${FLEET[0]}-cell ship. Press R to rotate.`);
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
      setMessage('Ships auto-placed! Click "Start Game" to begin.');
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
    actions: {
      placeShip: placeShipAction,
      startPlaying,
      fire,
      reset,
      autoPlaceHumanFleet,
    },
  };
}
