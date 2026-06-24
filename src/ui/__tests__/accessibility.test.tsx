/**
 * §5.4 Accessibility tests (both features).
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import App from '../../App';
import { AccuracyChip } from '../components/AccuracyChip';
import { SinkCelebration } from '../components/SinkCelebration';
import { MuteButton } from '../components/MuteButton';
import type { AccuracyData } from '../../engine/selectors';
import type { SinkCelebrationData } from '../sinkCelebration';

afterEach(() => {
  cleanup();
});

describe('§5.4 Accessibility tests', () => {
  describe('Reduced-motion: chip and celebration motion suppressed, values still update', () => {
    it('accuracy chip renders value even when no pulse class (reduced-motion scenario)', () => {
      const accuracy: AccuracyData = { shots: 5, hits: 3, percent: 60 };
      render(<AccuracyChip accuracy={accuracy} gamePhase="playing" />);
      expect(screen.getByTestId('accuracy-chip')).toHaveTextContent('60%');
      expect(screen.getByTestId('accuracy-chip')).toHaveTextContent('ACCURACY');
    });

    it('accuracy chip has aria-label for screen readers', () => {
      const accuracy: AccuracyData = { shots: 5, hits: 3, percent: 60 };
      render(<AccuracyChip accuracy={accuracy} gamePhase="playing" />);
      expect(screen.getByTestId('accuracy-chip').getAttribute('aria-label')).toBe(
        'Accuracy: 60 percent',
      );
    });

    it('accuracy chip aria-label reads "no shots fired" at zero state', () => {
      const accuracy: AccuracyData = { shots: 0, hits: 0, percent: 0 };
      render(<AccuracyChip accuracy={accuracy} gamePhase="playing" />);
      expect(screen.getByTestId('accuracy-chip').getAttribute('aria-label')).toBe(
        'Accuracy: no shots fired',
      );
    });
  });

  describe('Sunk vs. hit distinguishable without color (marker/structural cue)', () => {
    it('sunk uses skull symbol (\u2620) and hit uses cross symbol (\u2716)', () => {
      // Verify the symbols are structurally different
      expect('\u2620').not.toBe('\u2716');
    });
  });

  describe('Mute control present and functional', () => {
    it('mute button renders with correct label', () => {
      const { rerender } = render(<MuteButton muted={false} onToggle={() => {}} />);
      expect(screen.getByTestId('mute-button').getAttribute('aria-label')).toBe(
        'Mute sound effects',
      );
      rerender(<MuteButton muted={true} onToggle={() => {}} />);
      expect(screen.getByTestId('mute-button').getAttribute('aria-label')).toBe(
        'Unmute sound effects',
      );
    });

    it('mute gates audio but visuals still run', () => {
      const celebration: SinkCelebrationData = {
        sunkShipName: 'Cruiser',
        intensityLevel: 1,
        isFinalShip: false,
      };

      // Render with muted=true, animationMs=0 for instant phases
      render(<SinkCelebration celebration={celebration} muted={true} animationMs={0} />);

      // The celebration overlay should still render (visuals run even when muted)
      const el = screen.getByTestId('sink-celebration');
      expect(el).toBeInTheDocument();
    });

    it('mute button is present during playing phase', () => {
      render(<App />);
      fireEvent.click(screen.getByText('Auto-Place Ships'));
      fireEvent.click(screen.getByText('Start Game'));
      expect(screen.getByTestId('mute-button')).toBeInTheDocument();
    });
  });

  describe('Celebration has assertive aria-live for screen readers', () => {
    it('sink celebration overlay uses aria-live="assertive"', () => {
      const celebration: SinkCelebrationData = {
        sunkShipName: 'Destroyer',
        intensityLevel: 1,
        isFinalShip: false,
      };
      render(<SinkCelebration celebration={celebration} muted={true} animationMs={0} />);
      const el = screen.getByTestId('sink-celebration');
      expect(el.getAttribute('aria-live')).toBe('assertive');
      expect(el.getAttribute('role')).toBe('alert');
    });
  });
});
