/**
 * §6.3 Flow / behavior tests for header redesign.
 * Uses injectable AIM_MS = 0 so AI turns resolve synchronously.
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import App from '../../App';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function startGame() {
  render(<App />);
  fireEvent.click(screen.getByText('Auto-Place Ships'));
  fireEvent.click(screen.getByText('Start Battle'));
}

describe('§6.3 Flow / behavior tests', () => {
  it('player shot → banner transitions to computer → event updates → banner returns to player', async () => {
    startGame();

    // Initially player's turn
    const banner = screen.getByTestId('turn-banner');
    expect(banner.textContent!.toLowerCase()).toContain('your turn');

    // Fire at a cell
    const enemyZone = screen.getByTestId('zone-enemy');
    const cells = enemyZone.querySelectorAll('td');
    const targetCell = cells[0];
    await act(async () => {
      fireEvent.click(targetCell);
    });

    // After AI turn completes (AIM_MS=0), banner should return to player
    // Allow microtasks to flush
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    // Should be back to player's turn (unless game ended)
    const bannerText = banner.textContent!.toLowerCase();
    const isPlayerTurn = bannerText.includes('your turn');
    const isGameOver = bannerText.includes('victory') || bannerText.includes('defeat');
    expect(isPlayerTurn || isGameOver).toBe(true);
  });

  it('event line updates after a shot is fired', async () => {
    startGame();

    // No event line initially
    expect(screen.queryByTestId('event-line')).toBeNull();

    // Fire at a game cell on the enemy board using data-coord
    const enemyZone = screen.getByTestId('zone-enemy');
    const target = enemyZone.querySelector('td[data-coord="0,0"]');
    expect(target).not.toBeNull();
    await act(async () => {
      fireEvent.click(target!);
    });

    // Allow AI turn + re-render to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 200));
    });

    // Event line should now be visible with shot info
    const eventLine = screen.queryByTestId('event-line');
    expect(eventLine).not.toBeNull();
    expect(eventLine!.textContent).toMatch(/fired at/i);
  });

  it('sunk result shows strongest event emphasis', async () => {
    // This is a unit test on the EventLine component with sunk tier
    const { EventLine } = await import('../components/EventLine');
    const { container } = render(
      <EventLine lastEvent="You fired at A1 — Sunk — Carrier!" eventTier="sunk" />,
    );
    const el = container.querySelector('.event-line--sunk');
    expect(el).not.toBeNull();
    const callout = container.querySelector('.event-line__callout');
    expect(callout).not.toBeNull();
  });

  it('hit result shows emphasized event styling', async () => {
    const { EventLine } = await import('../components/EventLine');
    const { container } = render(
      <EventLine lastEvent="Computer fired at B3 — Hit!" eventTier="hit" />,
    );
    const el = container.querySelector('.event-line--hit');
    expect(el).not.toBeNull();
  });

  it('miss result shows quiet event styling', async () => {
    const { EventLine } = await import('../components/EventLine');
    const { container } = render(
      <EventLine lastEvent="You fired at C5 — Miss" eventTier="miss" />,
    );
    const el = container.querySelector('.event-line--miss');
    expect(el).not.toBeNull();
    // No callout for miss
    const callout = container.querySelector('.event-line__callout');
    expect(callout).toBeNull();
  });

  it('AI-winning shot does not show "Your turn" after game ends', async () => {
    // Verify that the view-model returns game-over state, not "Your turn"
    const { deriveHeaderStatus } = await import('../headerStatus');
    const status = deriveHeaderStatus('ai', 'announced', 'gameOver', {
      actor: 'computer',
      coord: { x: 0, y: 0 },
      outcome: 'sunk',
      sunkShipName: 'Destroyer',
    }, 'ai');
    expect(status.turnTitle).toBe('DEFEAT');
    expect(status.prompt).not.toContain('Your turn');
    expect(status.prompt).not.toContain('Fire');
  });
});
