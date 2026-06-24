import type { Turn, AiPhase } from '../app/useGameState';
import { labelFor } from '../engine/selectors';
import type { ShotOutcome } from '../engine/selectors';

// ─── Last-event data flowing from useGameState ──────────────────────────────

export interface LastShotEvent {
  actor: 'human' | 'computer';
  coord: { x: number; y: number };
  outcome: ShotOutcome;
  sunkShipName?: string;
}

// ─── View-model output ──────────────────────────────────────────────────────

export type EventTier = 'miss' | 'hit' | 'sunk';

export interface HeaderStatus {
  whoseTurn: 'player' | 'computer';
  turnTitle: string;
  prompt: string;
  lastEvent: string | null;
  eventTier: EventTier | null;
}

// ─── Pure view-model derivation ─────────────────────────────────────────────

export function deriveHeaderStatus(
  turn: Turn,
  aiPhase: AiPhase,
  gamePhase: 'setup' | 'playing' | 'gameOver',
  lastShot: LastShotEvent | null,
  winner?: 'human' | 'ai' | null,
): HeaderStatus {
  const whoseTurn: 'player' | 'computer' =
    turn === 'human' && aiPhase === 'idle' ? 'player' : 'computer';

  let turnTitle: string;
  let prompt: string;

  if (gamePhase === 'setup') {
    turnTitle = 'SETUP';
    prompt = 'Place your fleet';
  } else if (gamePhase === 'gameOver') {
    turnTitle = winner === 'human' ? 'VICTORY' : 'DEFEAT';
    prompt = winner === 'human'
      ? 'All enemy ships sunk!'
      : 'Your fleet has been destroyed';
  } else if (whoseTurn === 'player') {
    turnTitle = 'YOUR TURN';
    prompt = 'Fire at the enemy grid';
  } else {
    turnTitle = "COMPUTER'S TURN";
    prompt = aiPhase === 'aiming' ? 'Taking aim\u2026' : 'Firing\u2026';
  }

  // Last event line + tier
  let lastEvent: string | null = null;
  let eventTier: EventTier | null = null;

  if (lastShot) {
    const label = labelFor(lastShot.coord);
    const actorName = lastShot.actor === 'human' ? 'You fired' : 'Computer fired';
    const outcomeText =
      lastShot.outcome === 'miss'
        ? 'Miss'
        : lastShot.outcome === 'sunk'
          ? `Sunk${lastShot.sunkShipName ? ` \u2014 ${lastShot.sunkShipName}!` : '!'}`
          : 'Hit!';

    lastEvent = `${actorName} at ${label} \u2014 ${outcomeText}`;
    eventTier = lastShot.outcome;
  }

  return { whoseTurn, turnTitle, prompt, lastEvent, eventTier };
}
