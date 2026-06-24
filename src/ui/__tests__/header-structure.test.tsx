/**
 * §6.2 Structural / no-duplication tests for header redesign.
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

describe('§6.2 Structural / no-duplication tests', () => {
  it('turn-prompt text appears exactly once in the rendered header', () => {
    startGame();
    const header = screen.getByTestId('zone-header');
    const text = header.textContent!;
    const promptMatches = text.match(/Fire at the enemy grid/gi);
    expect(promptMatches).not.toBeNull();
    expect(promptMatches!.length).toBe(1);
  });

  it('banner has no click handler (not a button/link)', () => {
    startGame();
    const banner = screen.getByTestId('turn-banner');
    expect(banner.tagName).not.toBe('BUTTON');
    expect(banner.tagName).not.toBe('A');
    expect(banner.getAttribute('role')).not.toBe('button');
    expect(banner.getAttribute('role')).not.toBe('link');
    expect(banner.onclick).toBeNull();
    expect(banner.getAttribute('href')).toBeNull();
  });

  it('banner carries no interactive ARIA role', () => {
    startGame();
    const banner = screen.getByTestId('turn-banner');
    const role = banner.getAttribute('role');
    // Must be status (or similar non-interactive) — never button/link/tab
    expect(['button', 'link', 'tab', 'menuitem']).not.toContain(role);
  });

  it('exactly one turn-banner element in the header', () => {
    startGame();
    const header = screen.getByTestId('zone-header');
    const banners = header.querySelectorAll('[data-testid="turn-banner"]');
    expect(banners.length).toBe(1);
  });

  it('at most one event-line element in the header', () => {
    startGame();
    const header = screen.getByTestId('zone-header');
    const eventLines = header.querySelectorAll('[data-testid="event-line"]');
    expect(eventLines.length).toBeLessThanOrEqual(1);
  });

  it('banner renders during setup phase (shows SETUP)', () => {
    render(<App />);
    const banner = screen.getByTestId('turn-banner');
    expect(banner.textContent!.toLowerCase()).toContain('setup');
  });
});
