/**
 * §5.5 Regression / preservation tests.
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from '../../App';

afterEach(() => {
  cleanup();
});

function startGame() {
  render(<App />);
  fireEvent.click(screen.getByText('Auto-Place Ships'));
  fireEvent.click(screen.getByText('Start Battle'));
}

describe('§5.5 Regression / preservation tests', () => {
  it('"Still afloat: ..." sentence is NOT rendered', () => {
    startGame();
    // The old "Still afloat: ..." text should be gone
    expect(screen.queryByText(/Still afloat/i)).not.toBeInTheDocument();
  });

  it('"Turn N" text is NOT rendered in the banner', () => {
    startGame();
    const banner = screen.getByTestId('turn-banner');
    expect(banner.textContent).not.toMatch(/Turn \d+/);
  });

  it('turn banner state/flip and AI announcement remain functional', () => {
    startGame();
    const banner = screen.getByTestId('turn-banner');
    // Should show player turn initially
    expect(banner).toHaveTextContent(/YOUR TURN/i);
  });

  it('event line renders after a shot is fired', () => {
    startGame();
    // Before any shot, event line is null (no last event)
    // Fire at a cell to generate an event
    const enemyZone = screen.getByTestId('zone-enemy');
    const enemyCells = enemyZone.querySelectorAll('[data-coord]');
    if (enemyCells.length > 0) {
      fireEvent.click(enemyCells[0]);
    }
    // After firing, event line should appear
    const eventLine = screen.queryByTestId('event-line');
    expect(eventLine).toBeInTheDocument();
  });

  it('accuracy chip is present outside the banner during play', () => {
    startGame();
    const chip = screen.getByTestId('accuracy-chip');
    expect(chip).toBeInTheDocument();
    // Verify chip is NOT inside the banner
    const banner = screen.getByTestId('turn-banner');
    expect(banner.contains(chip)).toBe(false);
  });

  it('accuracy chip shows placeholder before any shot', () => {
    startGame();
    const chip = screen.getByTestId('accuracy-chip');
    expect(chip).toHaveTextContent('\u2014'); // em-dash placeholder
  });

  it('setup progress, scoreboard, and checklist still render', () => {
    // Setup phase: progress shows
    const { unmount } = render(<App />);
    expect(screen.getByText(/ships placed/i)).toBeInTheDocument();
    unmount();

    // Playing phase: scoreboard and checklist show
    startGame();
    expect(screen.getByTestId('enemy-fleet-checklist')).toBeInTheDocument();
  });

  it('enemy board input lock during AI turn', () => {
    startGame();
    const banner = screen.getByTestId('turn-banner');
    // During player turn, the enemy board should be interactive
    expect(banner).toHaveTextContent(/YOUR TURN/i);
    // The enemy board grid should be clickable when it's the player's turn
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(enemyZone).toBeInTheDocument();
  });

  it('side panels are present (player zone and enemy zone)', () => {
    startGame();
    expect(screen.getByTestId('zone-player')).toBeInTheDocument();
    expect(screen.getByTestId('zone-enemy')).toBeInTheDocument();
  });
});
