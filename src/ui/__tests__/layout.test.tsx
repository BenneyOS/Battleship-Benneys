/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from '../../App';

afterEach(() => {
  cleanup();
});

/** Helper: auto-place ships and click Start Battle to reach playing phase */
function startGame() {
  render(<App />);
  fireEvent.click(screen.getByText('Auto-Place Ships'));
  fireEvent.click(screen.getByText('Start Battle'));
}

describe('§5.1 Structure / placement tests', () => {
  it('setup phase renders header and player zones only (enemy absent)', () => {
    render(<App />);
    expect(screen.getByTestId('zone-header')).toBeTruthy();
    expect(screen.getByTestId('zone-player')).toBeTruthy();
    expect(screen.queryByTestId('zone-enemy')).toBeNull();
  });

  it('playing phase renders all three zones: header, player, enemy', () => {
    startGame();
    expect(screen.getByTestId('zone-header')).toBeTruthy();
    expect(screen.getByTestId('zone-player')).toBeTruthy();
    expect(screen.getByTestId('zone-enemy')).toBeTruthy();
  });

  it('player board renders inside the player zone', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('Your Fleet');
  });

  it('enemy board renders inside the enemy zone during play', () => {
    startGame();
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(enemyZone.textContent).toContain('Enemy Waters');
  });

  it('no aria-live announcement appears outside the header zone', () => {
    startGame();
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(playerZone.querySelectorAll('[aria-live]').length).toBe(0);
    expect(enemyZone.querySelectorAll('[aria-live]').length).toBe(0);
  });

  it('SetupProgress renders inside the player zone during setup', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('ships placed');
  });

  it('no status element is duplicated across zones during play', () => {
    startGame();
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(playerZone.querySelectorAll('[role="status"]').length).toBe(0);
    expect(enemyZone.querySelectorAll('[role="status"]').length).toBe(0);
  });
});

describe('§5.2 Responsive tests', () => {
  it('layout root uses game-layout class for CSS Grid', () => {
    render(<App />);
    const layout = document.querySelector('.game-layout');
    expect(layout).not.toBeNull();
  });

  it('DOM reading order is header -> player during setup (enemy absent)', () => {
    render(<App />);
    const layout = document.querySelector('.game-layout');
    const children = Array.from(layout!.children);
    const zoneOrder = children
      .filter((el) => el.hasAttribute('data-testid'))
      .map((el) => el.getAttribute('data-testid'));
    expect(zoneOrder[0]).toBe('zone-header');
    expect(zoneOrder[1]).toBe('zone-player');
    expect(zoneOrder.includes('zone-enemy')).toBe(false);
  });

  it('DOM reading order is header -> player -> enemy during play', () => {
    startGame();
    const layout = document.querySelector('.game-layout');
    const children = Array.from(layout!.children);
    const zoneOrder = children
      .filter((el) => el.hasAttribute('data-testid'))
      .map((el) => el.getAttribute('data-testid'));
    expect(zoneOrder[0]).toBe('zone-header');
    expect(zoneOrder[1]).toBe('zone-player');
    expect(zoneOrder[2]).toBe('zone-enemy');
  });

  it('setup has one board-container (player only)', () => {
    render(<App />);
    const containers = document.querySelectorAll('.board-container');
    expect(containers.length).toBe(1);
  });

  it('playing phase has two board-containers', () => {
    startGame();
    const containers = document.querySelectorAll('.board-container');
    expect(containers.length).toBe(2);
  });

  it('player zone board-container is inside zone-player', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const container = playerZone.querySelector('.board-container');
    expect(container).not.toBeNull();
  });

  it('enemy zone board-container is inside zone-enemy during play', () => {
    startGame();
    const enemyZone = screen.getByTestId('zone-enemy');
    const container = enemyZone.querySelector('.board-container');
    expect(container).not.toBeNull();
  });
});

describe('§5.3 Behavior-preservation tests', () => {
  it('turn banner renders in header after game starts (playing phase)', () => {
    startGame();
    const header = screen.getByTestId('zone-header');
    const banner = header.querySelector('[role="status"]');
    expect(banner).not.toBeNull();
    expect(banner!.textContent!.toLowerCase()).toContain('your turn');
  });

  it('turn banner is NOT in player or enemy zones', () => {
    startGame();
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(playerZone.querySelectorAll('[role="status"]').length).toBe(0);
    expect(enemyZone.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it('player zone shows fleet damage readout during play', () => {
    startGame();
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('Your fleet:');
  });

  it('BattleScoreboard renders in enemy zone during play', () => {
    startGame();
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(enemyZone.textContent).toContain('sunk');
  });

  it('side identity cues are present with text labels during play', () => {
    startGame();
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(playerZone.textContent).toContain('Your Fleet');
    expect(enemyZone.textContent).toContain('Enemy Waters');
  });

  it('START BATTLE button is present but disabled before all ships placed', () => {
    render(<App />);
    const btn = screen.getByText('Start Battle');
    expect(btn).toBeTruthy();
    expect(btn).toBeDisabled();
  });

  it('START BATTLE button becomes enabled after all ships placed', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    const btn = screen.getByText('Start Battle');
    expect(btn).not.toBeDisabled();
  });
});
