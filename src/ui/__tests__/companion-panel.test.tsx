/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import App from '../../App';

describe('Companion panel layout (§6.4)', () => {
  afterEach(() => {
    cleanup();
  });

  it('progress panel is a flow sibling, NOT absolutely positioned over the board', () => {
    render(<App />);
    const panel = screen.getByTestId('player-companion-panel');
    const style = window.getComputedStyle(panel);
    // Must NOT be absolutely positioned (overlay)
    expect(style.position).not.toBe('absolute');
    expect(style.position).not.toBe('fixed');
  });

  it('setup indicator + ship roster render in player companion panel', () => {
    render(<App />);
    const panel = screen.getByTestId('player-companion-panel');
    // Should contain progress bar
    expect(panel.querySelector('[role="progressbar"]')).not.toBeNull();
    // Should contain ship names in the panel's parent section context
    const playerZone = screen.getByTestId('zone-player');
    expect(playerZone.textContent).toContain('Carrier');
    expect(playerZone.textContent).toContain('Destroyer');
  });

  it('enemy companion panel with scoreboard + checklist shows after game starts', () => {
    render(<App />);

    // Auto-place and start
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const enemyPanel = screen.getByTestId('enemy-companion-panel');
    // Should have scoreboard (percent bar)
    expect(enemyPanel.querySelector('[role="progressbar"]')).not.toBeNull();
    // Should have checklist
    expect(screen.getByTestId('enemy-fleet-checklist')).not.toBeNull();
  });

  it('"Your fleet: N lost" in LEFT zone panel during play', () => {
    render(<App />);

    // Auto-place and start
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const playerPanel = screen.getByTestId('player-companion-panel');
    expect(playerPanel.textContent).toContain('Your fleet:');
    expect(playerPanel.textContent).toContain('lost');
  });

  it('enemy companion panel is NOT absolutely positioned', () => {
    render(<App />);

    // Auto-place and start
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const panel = screen.getByTestId('enemy-companion-panel');
    const style = window.getComputedStyle(panel);
    expect(style.position).not.toBe('absolute');
    expect(style.position).not.toBe('fixed');
  });

  it('companion panel has the companion-panel class for proper styling', () => {
    render(<App />);
    const panel = screen.getByTestId('player-companion-panel');
    expect(panel.className).toContain('companion-panel');
  });

  it('checklist renders all 5 enemy ships by name with afloat status', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const checklist = screen.getByTestId('enemy-fleet-checklist');
    const items = checklist.querySelectorAll('li');
    expect(items.length).toBe(5);

    // All should be afloat initially
    items.forEach((item) => {
      expect(item.textContent).toContain('afloat');
    });
  });

  it('checklist never reveals position of afloat ships (no-position-leak)', () => {
    render(<App />);

    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const checklist = screen.getByTestId('enemy-fleet-checklist');
    // No coordinate patterns (e.g. "0,0" or "x:" or position info) in text
    const text = checklist.textContent || '';
    expect(text).not.toMatch(/\d+,\d+/); // no coord keys
    expect(text).not.toMatch(/origin/i);
    expect(text).not.toMatch(/position/i);
  });

  it('board-container does NOT use aspect-ratio (prevents height cap that causes overflow into panel)', () => {
    render(<App />);
    const containers = document.querySelectorAll('.board-container');
    containers.forEach((container) => {
      const style = window.getComputedStyle(container);
      // aspect-ratio must not be set — it caps the container height below the
      // table content height, causing the board to visually overflow into the
      // companion panel below.
      expect(style.aspectRatio).not.toBe('1');
      expect(style.aspectRatio).not.toBe('1 / 1');
    });
  });

  it('player companion panel is a later sibling of board-container in DOM (setup phase)', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const children = Array.from(playerZone.children);
    const boardIdx = children.findIndex((el) => el.classList.contains('board-container'));
    const panelIdx = children.findIndex((el) => el.getAttribute('data-testid') === 'player-companion-panel');
    expect(boardIdx).toBeGreaterThanOrEqual(0);
    expect(panelIdx).toBeGreaterThan(boardIdx);
  });

  it('enemy companion panel is a later sibling of board-container in DOM (play phase)', () => {
    render(<App />);
    fireEvent.click(screen.getByText('Auto-Place Ships'));
    fireEvent.click(screen.getByText('Start Game'));

    const enemyZone = screen.getByTestId('zone-enemy');
    const children = Array.from(enemyZone.children);
    const boardIdx = children.findIndex((el) => el.classList.contains('board-container'));
    const panelIdx = children.findIndex((el) => el.getAttribute('data-testid') === 'enemy-companion-panel');
    expect(boardIdx).toBeGreaterThanOrEqual(0);
    expect(panelIdx).toBeGreaterThan(boardIdx);
  });

  it('board-container has no overflow-hiding styles that would clip content', () => {
    render(<App />);
    const containers = document.querySelectorAll('.board-container');
    containers.forEach((container) => {
      const style = window.getComputedStyle(container);
      // overflow must be visible (or auto) so content is never clipped
      expect(style.overflow).not.toBe('hidden');
    });
  });
});
