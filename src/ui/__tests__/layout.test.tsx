/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from '../../App';

afterEach(() => {
  cleanup();
});

describe('§5.1 Structure / placement tests', () => {
  it('three zones exist: header, player, enemy', () => {
    render(<App />);
    expect(screen.getByTestId('zone-header')).toBeTruthy();
    expect(screen.getByTestId('zone-player')).toBeTruthy();
    expect(screen.getByTestId('zone-enemy')).toBeTruthy();
  });

  it('player board renders inside the player zone', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('Your Fleet');
    expect(playerZone.textContent).toContain('Your Side');
  });

  it('enemy board renders inside the enemy zone', () => {
    render(<App />);
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(enemyZone.textContent).toContain('Enemy Waters');
    expect(enemyZone.textContent).toContain('Enemy Side');
  });

  it('no aria-live announcement appears outside the header zone', () => {
    render(<App />);
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

  it('no status element is duplicated across zones', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    // No role="status" elements should appear in player or enemy zones
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

  it('DOM reading order is header -> player -> enemy', () => {
    render(<App />);
    const layout = document.querySelector('.game-layout');
    const children = Array.from(layout!.children);
    const zoneOrder = children
      .filter((el) => el.hasAttribute('data-testid'))
      .map((el) => el.getAttribute('data-testid'));
    // header first, then player, then enemy (matches stacking order)
    expect(zoneOrder[0]).toBe('zone-header');
    expect(zoneOrder[1]).toBe('zone-player');
    expect(zoneOrder[2]).toBe('zone-enemy');
  });

  it('boards are wrapped in board-container for square aspect ratio', () => {
    render(<App />);
    const containers = document.querySelectorAll('.board-container');
    expect(containers.length).toBe(2);
  });

  it('player zone board-container is inside zone-player', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const container = playerZone.querySelector('.board-container');
    expect(container).not.toBeNull();
  });

  it('enemy zone board-container is inside zone-enemy', () => {
    render(<App />);
    const enemyZone = screen.getByTestId('zone-enemy');
    const container = enemyZone.querySelector('.board-container');
    expect(container).not.toBeNull();
  });
});

describe('§5.3 Behavior-preservation tests', () => {
  it('turn banner renders in header after game starts (playing phase)', () => {
    render(<App />);
    const header = screen.getByTestId('zone-header');
    // Click Auto-Place then Start to get to playing phase
    const autoBtn = screen.getByText('Auto-Place Ships');
    fireEvent.click(autoBtn);
    const startBtn = screen.getByText('Start Game');
    fireEvent.click(startBtn);
    // Now TurnBanner should be in the header with role="status"
    const banner = header.querySelector('[role="status"]');
    expect(banner).not.toBeNull();
    expect(banner!.textContent).toContain('Your turn');
  });

  it('turn banner is NOT in player or enemy zones', () => {
    render(<App />);
    // Get to playing phase
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    expect(playerZone.querySelectorAll('[role="status"]').length).toBe(0);
    expect(enemyZone.querySelectorAll('[role="status"]').length).toBe(0);
  });

  it('player zone shows fleet damage readout during play', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('Your fleet:');
  });

  it('BattleScoreboard renders in enemy zone during play', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));
    const enemyZone = screen.getByTestId('zone-enemy');
    // BattleScoreboard shows sunk/remaining text
    expect(enemyZone.textContent).toContain('sunk');
  });

  it('side identity cues are present with text labels (not color alone)', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const enemyZone = screen.getByTestId('zone-enemy');
    // Player zone has text "Your Side" paired with icon
    expect(playerZone.textContent).toContain('Your Side');
    // Enemy zone has text "Enemy Side" paired with icon
    expect(enemyZone.textContent).toContain('Enemy Side');
  });
});
