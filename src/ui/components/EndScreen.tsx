import { useState, useEffect, useRef } from 'react';
import type { Board } from '../../engine/types';
import { BOARD_SIZE } from '../../engine/types';
import { getCellState } from '../../engine/board';
import type { FleetProgressData, AccuracyData } from '../../engine/selectors';

// ─── Types ───────────────────────────────────────────────────────────────────

type Outcome = 'win' | 'loss';

interface EndScreenProps {
  outcome: Outcome;
  board: Board;
  fleetProgress: FleetProgressData;
  accuracy: AccuracyData;
  lastSunkShipName: string | null;
  onNewGame: () => void;
  /** Override all timing to 0 in tests */
  animationMs?: number;
  /** Loss: how many enemy ships the player managed to sink */
  enemySunkCount?: number;
}

type CascadePhase = 'impact' | 'grid' | 'hierarchy' | 'action';

const COLUMN_LABELS = 'ABCDEFGHIJ';

// ─── Outcome config — the ONLY three things that vary ─────────────────────

const OUTCOME_CONFIG = {
  win: {
    tone: 'victory' as const,
    boardTitle: 'Enemy Waters',
    headline: 'VICTORY',
    icon: 'star' as const,
    medal2Icon: '💥',
    medal2Label: 'FINAL BLOW',
  },
  loss: {
    tone: 'defeat' as const,
    boardTitle: 'Your Fleet',
    headline: 'DEFEAT',
    icon: 'crosshair' as const,
    medal2Icon: '💀',
    medal2Label: 'SHIPS SUNK',
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

export function EndScreen({
  outcome,
  board,
  fleetProgress: progress,
  accuracy,
  lastSunkShipName,
  onNewGame,
  animationMs,
  enemySunkCount,
}: EndScreenProps) {
  const [phase, setPhase] = useState<CascadePhase>('impact');
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const duration = animationMs ?? 600;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase('grid'), duration));
    timers.push(setTimeout(() => setPhase('hierarchy'), duration * 2));
    timers.push(setTimeout(() => setPhase('action'), duration * 3));

    phaseTimers.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [duration]);

  const phaseIdx = ['impact', 'grid', 'hierarchy', 'action'].indexOf(phase);
  const showGrid = phaseIdx >= 1;
  const showHierarchy = phaseIdx >= 2;
  const showAction = phaseIdx >= 3;

  const cfg = OUTCOME_CONFIG[outcome];
  const { tone } = cfg;

  // Parameter 3: copy + stats — subtitle and second medal value
  const subtitle = outcome === 'win'
    ? `You've sunk ${progress.sunk} of ${progress.total} ships`
    : 'Your fleet has been destroyed';

  const medal2Value = outcome === 'win'
    ? (lastSunkShipName ? lastSunkShipName.toUpperCase() : null)
    : `${enemySunkCount ?? 0} / ${progress.total}`;

  return (
    <div
      className={`endgame-screen endgame-screen--${tone}`}
      data-testid="endgame-screen"
      data-tone={tone}
      data-phase={phase}
    >
      {/* Phase 1: Impact glow backdrop */}
      <div className={`endgame-screen__impact ${phase !== 'impact' ? 'endgame-screen__impact--done' : ''}`} />

      {/* Phase 2: Single centered board */}
      {showGrid && (
        <div className="endgame-screen__grid" data-testid="endgame-grid">
          <h3 className={`endgame-screen__grid-title endgame-screen__grid-title--${tone}`}>
            {cfg.boardTitle}
          </h3>
          <div className="endgame-screen__table-wrap">
            <table className="endgame-screen__table">
              <thead>
                <tr>
                  <th className="endgame-screen__coord" style={{ width: 24 }} />
                  {Array.from({ length: BOARD_SIZE }, (_, i) => (
                    <th key={i} className="endgame-screen__coord endgame-screen__coord--col">
                      {COLUMN_LABELS[i]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: BOARD_SIZE }, (_, y) => (
                  <tr key={y}>
                    <td className="endgame-screen__coord">{y + 1}</td>
                    {Array.from({ length: BOARD_SIZE }, (_, x) => {
                      const cellState = getCellState(board, { x, y }, true);
                      return (
                        <td
                          key={x}
                          className={`endgame-screen__cell endgame-screen__cell--${cellState}`}
                          data-coord={`${x},${y}`}
                        />
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Phase 3: Hierarchy cascade */}
      {showHierarchy && (
        <div className="endgame-screen__hierarchy" data-testid="endgame-hierarchy">
          {/* Vector icon — tone-recolored */}
          <div className={`endgame-screen__trophy endgame-screen__trophy--${tone}`}>
            <span className={`endgame-screen__vector-icon endgame-screen__vector-icon--${cfg.icon}`} aria-hidden="true" />
          </div>

          {/* Headline */}
          <h1 className={`endgame-screen__title endgame-screen__title--${tone}`} data-testid="endgame-title">
            {cfg.headline}
          </h1>

          {/* Subtitle */}
          <p className="endgame-screen__fleet-count" data-testid="endgame-fleet-count">
            {subtitle}
          </p>

          {/* Two-medal row — same component, same structure */}
          <div className="endgame-screen__medals">
            {/* Medal 1: Accuracy (always) */}
            <div className={`endgame-screen__medal endgame-screen__medal--${tone}`} data-testid="endgame-accuracy-medal" style={{ '--medal-i': 0 } as React.CSSProperties}>
              <span className="endgame-screen__medal-icon">🎯</span>
              <span className={`endgame-screen__medal-value endgame-screen__medal-value--${tone}`}>{accuracy.percent}%</span>
              <span className="endgame-screen__medal-label">ACCURACY</span>
            </div>

            {/* Medal 2: outcome-specific stat */}
            {medal2Value && (
              <div className={`endgame-screen__medal endgame-screen__medal--${tone}`} data-testid={outcome === 'win' ? 'endgame-finalblow-medal' : 'endgame-sunk-medal'} style={{ '--medal-i': 1 } as React.CSSProperties}>
                <span className="endgame-screen__medal-icon">{cfg.medal2Icon}</span>
                <span className={`endgame-screen__medal-value endgame-screen__medal-value--${tone}`}>{medal2Value}</span>
                <span className="endgame-screen__medal-label">{cfg.medal2Label}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 4: Action lock — NEW GAME */}
      {showAction && (
        <div className="endgame-screen__action" data-testid="endgame-action">
          <button
            onClick={onNewGame}
            className={`endgame-screen__cta endgame-screen__cta--${tone}`}
            data-testid="endgame-new-game"
          >
            NEW GAME
          </button>
        </div>
      )}
    </div>
  );
}
