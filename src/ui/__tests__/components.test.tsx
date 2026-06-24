/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { TurnBanner } from '../components/TurnBanner';
import { SetupProgress } from '../components/SetupProgress';
import { BattleScoreboard } from '../components/BattleScoreboard';
import type { SetupProgressData, FleetProgressData } from '../../engine/selectors';

afterEach(() => {
  cleanup();
});

describe('§6.6 Component / UI smoke tests', () => {
  describe('TurnBanner', () => {
    it('renders correct text for human turn', () => {
      render(
        <TurnBanner turn="human" aiPhase="idle" aiAnnouncement={null} gamePhase="playing" />,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'Your turn \u2014 fire at the enemy grid',
      );
    });

    it('renders "taking aim" for AI aiming phase', () => {
      render(
        <TurnBanner turn="ai" aiPhase="aiming" aiAnnouncement={null} gamePhase="playing" />,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        'Computer is taking aim',
      );
    });

    it('renders AI announcement when in announced phase', () => {
      render(
        <TurnBanner
          turn="ai"
          aiPhase="announced"
          aiAnnouncement="Computer fires at C3 \u2014 Hit!"
          gamePhase="playing"
        />,
      );
      expect(screen.getByRole('status')).toHaveTextContent(
        /Computer fires at C3/,
      );
    });

    it('does not render during setup phase', () => {
      const { container } = render(
        <TurnBanner turn="human" aiPhase="idle" aiAnnouncement={null} gamePhase="setup" />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('uses aria-live="polite" for announcements', () => {
      render(
        <TurnBanner turn="human" aiPhase="idle" aiAnnouncement={null} gamePhase="playing" />,
      );
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('SetupProgress', () => {
    it('renders correct placed/total labels', () => {
      const progress: SetupProgressData = {
        placed: 3,
        total: 5,
        remaining: 2,
        nextShip: { name: 'Submarine', length: 3 },
        percent: 60,
        isComplete: false,
      };
      render(<SetupProgress progress={progress} />);
      expect(screen.getByText(/3 of 5/)).toBeInTheDocument();
      expect(screen.getByText(/Next: Submarine \(3\)/)).toBeInTheDocument();
    });

    it('renders progress bar at correct width', () => {
      const progress: SetupProgressData = {
        placed: 3,
        total: 5,
        remaining: 2,
        nextShip: { name: 'Submarine', length: 3 },
        percent: 60,
        isComplete: false,
      };
      render(<SetupProgress progress={progress} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '60');
      expect(bar.style.width).toBe('60%');
    });

    it('renders 100% when all ships placed', () => {
      const progress: SetupProgressData = {
        placed: 5,
        total: 5,
        remaining: 0,
        nextShip: null,
        percent: 100,
        isComplete: true,
      };
      render(<SetupProgress progress={progress} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '100');
      expect(bar.style.width).toBe('100%');
    });
  });

  describe('BattleScoreboard', () => {
    it('renders correct sunk/total labels and percent', () => {
      const progress: FleetProgressData = {
        total: 5,
        sunk: 2,
        remaining: 3,
        percent: 40,

        isDefeated: false,
      };
      render(<BattleScoreboard progress={progress} milestoneMessage={null} />);
      expect(screen.getByText(/2 of 5/)).toBeInTheDocument();
      expect(screen.getByText(/3 more to go/)).toBeInTheDocument();
      expect(screen.getByText(/40% of the enemy fleet destroyed/)).toBeInTheDocument();
    });

    it('renders progress bar at correct width', () => {
      const progress: FleetProgressData = {
        total: 5,
        sunk: 2,
        remaining: 3,
        percent: 40,

        isDefeated: false,
      };
      render(<BattleScoreboard progress={progress} milestoneMessage={null} />);
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '40');
      expect(bar.style.width).toBe('40%');
    });

    it('renders milestone message when provided', () => {
      const progress: FleetProgressData = {
        total: 5,
        sunk: 4,
        remaining: 1,
        percent: 80,

        isDefeated: false,
      };
      render(
        <BattleScoreboard
          progress={progress}
          milestoneMessage="70% of the enemy fleet is down!"
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent(
        '70% of the enemy fleet is down!',
      );
    });

    it('does not render milestone when null', () => {
      const progress: FleetProgressData = {
        total: 5,
        sunk: 1,
        remaining: 4,
        percent: 20,

        isDefeated: false,
      };
      render(<BattleScoreboard progress={progress} milestoneMessage={null} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});
