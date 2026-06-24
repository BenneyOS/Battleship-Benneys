/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { deriveHeaderStatus } from '../headerStatus';
import type { LastShotEvent } from '../headerStatus';

describe('§6.1 Unit tests — status view-model', () => {
  it('player turn yields whoseTurn=player and fire prompt', () => {
    const status = deriveHeaderStatus('human', 'idle', 'playing', null);
    expect(status.whoseTurn).toBe('player');
    expect(status.turnTitle).toBe('YOUR TURN');
    expect(status.prompt).toBe('Fire at the enemy grid');
  });

  it('AI aiming phase yields whoseTurn=computer and taking-aim prompt', () => {
    const status = deriveHeaderStatus('ai', 'aiming', 'playing', null);
    expect(status.whoseTurn).toBe('computer');
    expect(status.turnTitle).toBe("COMPUTER'S TURN");
    expect(status.prompt).toBe('Taking aim\u2026');
  });

  it('AI announced phase yields whoseTurn=computer', () => {
    const status = deriveHeaderStatus('ai', 'announced', 'playing', null);
    expect(status.whoseTurn).toBe('computer');
    expect(status.turnTitle).toBe("COMPUTER'S TURN");
  });

  it('lastEvent reflects miss with correct label', () => {
    const shot: LastShotEvent = {
      actor: 'computer',
      coord: { x: 8, y: 2 },
      outcome: 'miss',
    };
    const status = deriveHeaderStatus('human', 'idle', 'playing', shot);
    expect(status.lastEvent).toBe('Computer fired at I3 \u2014 Miss');
    expect(status.eventTier).toBe('miss');
  });

  it('lastEvent reflects hit with correct label', () => {
    const shot: LastShotEvent = {
      actor: 'computer',
      coord: { x: 2, y: 2 },
      outcome: 'hit',
    };
    const status = deriveHeaderStatus('human', 'idle', 'playing', shot);
    expect(status.lastEvent).toBe('Computer fired at C3 \u2014 Hit!');
    expect(status.eventTier).toBe('hit');
  });

  it('lastEvent reflects sunk with ship name', () => {
    const shot: LastShotEvent = {
      actor: 'computer',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Carrier',
    };
    const status = deriveHeaderStatus('human', 'idle', 'playing', shot);
    expect(status.lastEvent).toBe('Computer fired at A1 \u2014 Sunk \u2014 Carrier!');
    expect(status.eventTier).toBe('sunk');
  });

  it('human shot shows "You fired"', () => {
    const shot: LastShotEvent = {
      actor: 'human',
      coord: { x: 5, y: 7 },
      outcome: 'hit',
    };
    const status = deriveHeaderStatus('ai', 'aiming', 'playing', shot);
    expect(status.lastEvent).toBe('You fired at F8 \u2014 Hit!');
    expect(status.eventTier).toBe('hit');
  });

  it('prompt is exposed only once (no second prompt field)', () => {
    const status = deriveHeaderStatus('human', 'idle', 'playing', null);
    const keys = Object.keys(status);
    const promptKeys = keys.filter((k) => k.toLowerCase().includes('prompt'));
    expect(promptKeys).toEqual(['prompt']);
  });

  it('setup phase yields SETUP title', () => {
    const status = deriveHeaderStatus('human', 'idle', 'setup', null);
    expect(status.turnTitle).toBe('SETUP');
    expect(status.prompt).toBe('Place your fleet');
  });

  it('game over with human winner yields VICTORY', () => {
    const status = deriveHeaderStatus('human', 'idle', 'gameOver', null, 'human');
    expect(status.turnTitle).toBe('VICTORY');
    expect(status.prompt).toBe('All enemy ships sunk!');
  });

  it('game over with AI winner yields DEFEAT', () => {
    const status = deriveHeaderStatus('human', 'idle', 'gameOver', null, 'ai');
    expect(status.turnTitle).toBe('DEFEAT');
    expect(status.prompt).toBe('Your fleet has been destroyed');
  });

  it('lastEvent is null when no shot has been fired', () => {
    const status = deriveHeaderStatus('human', 'idle', 'playing', null);
    expect(status.lastEvent).toBeNull();
    expect(status.eventTier).toBeNull();
  });
});
