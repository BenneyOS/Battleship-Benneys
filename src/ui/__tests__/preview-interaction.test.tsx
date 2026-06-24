/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import App from '../../App';

describe('Placement preview interaction (§6.2)', () => {
  afterEach(() => {
    cleanup();
    // Restore ontouchstart for touch tests that may have deleted it
  });

  // jsdom has 'ontouchstart' in window by default, which makes our code
  // think it's a touch device. Delete it for desktop tests.
  function forceDesktop() {
    delete (window as unknown as Record<string, unknown>).ontouchstart;
  }

  it('hovering a cell shows preview cells with valid color', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');
    const cells = playerZone.querySelectorAll('td[data-coord]');
    expect(cells.length).toBe(100);

    // Hover over cell (0,0) — should show valid preview (green-ish)
    fireEvent.mouseEnter(cells[0]);

    // After hover, multiple cells should have the valid preview color
    let validPreviewCount = 0;
    playerZone.querySelectorAll('td[data-coord]').forEach((cell) => {
      const bg = (cell as HTMLElement).style.backgroundColor;
      if (bg.includes('46, 204, 113')) validPreviewCount++;
    });
    // First ship is length 5 horizontal, so 5 cells should be green
    expect(validPreviewCount).toBe(5);
  });

  it('hovering an invalid position shows red preview', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');

    // Hover over cell (8,0) — horizontal ship length 5 would go off-board
    const cell8_0 = playerZone.querySelector('td[data-coord="8,0"]');
    expect(cell8_0).not.toBeNull();
    fireEvent.mouseEnter(cell8_0!);

    // Should show red invalid preview
    let invalidPreviewCount = 0;
    playerZone.querySelectorAll('td[data-coord]').forEach((cell) => {
      const bg = (cell as HTMLElement).style.backgroundColor;
      if (bg.includes('231, 76, 60')) invalidPreviewCount++;
    });
    expect(invalidPreviewCount).toBeGreaterThan(0);
  });

  it('invalid-position click does not commit and does not advance progress', () => {
    forceDesktop();
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');

    // Hover and click at invalid position (8,0) — length 5 horizontal goes off-board
    const cell8_0 = playerZone.querySelector('td[data-coord="8,0"]');
    fireEvent.mouseEnter(cell8_0!);
    fireEvent.click(cell8_0!);

    // Progress should still show "0 of 5"
    expect(screen.getByText(/0 of 5/)).toBeTruthy();
  });

  it('valid-position click commits and advances; preview reflects next ship length', () => {
    forceDesktop();
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');

    // Click at valid position (0,0) — length 5 horizontal, all in-bounds
    const cell0_0 = playerZone.querySelector('td[data-coord="0,0"]');
    act(() => {
      fireEvent.mouseEnter(cell0_0!);
      fireEvent.click(cell0_0!);
    });

    // Progress should advance — check the aria-label on the progress bar
    const progressBar = playerZone.querySelector('[role="progressbar"]');
    expect(progressBar).not.toBeNull();
    expect(progressBar!.getAttribute('aria-label')).toContain('1 of 5');

    // Next ship is Battleship (length 4), hover another cell to verify
    const cell0_2 = playerZone.querySelector('td[data-coord="0,2"]');
    act(() => {
      fireEvent.mouseEnter(cell0_2!);
    });

    // Should show 4 cells in preview (next ship is length 4)
    let validPreviewCount = 0;
    playerZone.querySelectorAll('td[data-coord]').forEach((cell) => {
      const bg = (cell as HTMLElement).style.backgroundColor;
      if (bg.includes('46, 204, 113')) validPreviewCount++;
    });
    expect(validPreviewCount).toBe(4);
  });

  it('leaving the board clears preview state', () => {
    render(<App />);
    const playerZone = screen.getByTestId('zone-player');

    // Hover a cell first
    const cell0_0 = playerZone.querySelector('td[data-coord="0,0"]');
    fireEvent.mouseEnter(cell0_0!);

    // Should have preview cells
    let previewCount = 0;
    playerZone.querySelectorAll('td[data-coord]').forEach((cell) => {
      const bg = (cell as HTMLElement).style.backgroundColor;
      if (bg.includes('46, 204, 113') || bg.includes('231, 76, 60')) previewCount++;
    });
    expect(previewCount).toBeGreaterThan(0);

    // Leave the board
    const boardWrapper = playerZone.querySelector('[style*="inline-block"]');
    fireEvent.mouseLeave(boardWrapper!);

    // Preview should be cleared
    let clearedCount = 0;
    playerZone.querySelectorAll('td[data-coord]').forEach((cell) => {
      const bg = (cell as HTMLElement).style.backgroundColor;
      if (bg.includes('46, 204, 113') || bg.includes('231, 76, 60')) clearedCount++;
    });
    expect(clearedCount).toBe(0);
  });

  it('touch: tap-preview then tap-confirm on same anchor commits', () => {
    Object.defineProperty(window, 'ontouchstart', { value: true, configurable: true });
    render(<App />);

    const playerZone = screen.getByTestId('zone-player');
    const cell0_0 = playerZone.querySelector('td[data-coord="0,0"]');

    // First tap — previews only
    fireEvent.click(cell0_0!);
    expect(screen.getByText(/0 of 5/)).toBeTruthy();

    // Second tap on same anchor — commits
    fireEvent.click(cell0_0!);
    expect(screen.getByText(/1 of 5/)).toBeTruthy();

    delete (window as unknown as Record<string, unknown>).ontouchstart;
  });

  it('touch: different cell relocates without committing', () => {
    Object.defineProperty(window, 'ontouchstart', { value: true, configurable: true });
    render(<App />);

    const playerZone = screen.getByTestId('zone-player');
    const cell0_0 = playerZone.querySelector('td[data-coord="0,0"]');
    const cell0_2 = playerZone.querySelector('td[data-coord="0,2"]');

    // First tap at (0,0) — previews
    fireEvent.click(cell0_0!);
    expect(screen.getByText(/0 of 5/)).toBeTruthy();

    // Tap different cell (0,2) — relocates preview, does NOT commit
    fireEvent.click(cell0_2!);
    expect(screen.getByText(/0 of 5/)).toBeTruthy();

    delete (window as unknown as Record<string, unknown>).ontouchstart;
  });
});
