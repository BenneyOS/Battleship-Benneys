import { useState, useEffect, useRef } from 'react';
import type { Board } from '../../engine/types';
import { BOARD_SIZE } from '../../engine/types';
import { getCellState } from '../../engine/board';
import type { FleetProgressData, AccuracyData } from '../../engine/selectors';

// ─── Types ───────────────────────────────────────────────────────────────────

interface VictoryScreenProps {
  board: Board;
  fleetProgress: FleetProgressData;
  accuracy: AccuracyData;
  lastSunkShipName: string | null;
  isVictory: boolean;
  onNewGame: () => void;
  /** Override all timing to 0 in tests */
  animationMs?: number;
  /** Defeat: how many enemy ships the player managed to sink */
  enemySunkCount?: number;
}

type CascadePhase = 'impact' | 'grid' | 'hierarchy' | 'action';

const COLUMN_LABELS = 'ABCDEFGHIJ';

// ─── Component ───────────────────────────────────────────────────────────────

export function VictoryScreen({
  board,
  fleetProgress: progress,
  accuracy,
  lastSunkShipName,
  isVictory,
  onNewGame,
  animationMs,
  enemySunkCount,
}: VictoryScreenProps) {
  const [phase, setPhase] = useState<CascadePhase>('impact');
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const duration = animationMs ?? 600;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Sequenced cascade: impact → grid → hierarchy → action
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

  const tone = isVictory ? 'victory' : 'defeat';

  return (
    <div
      className={`endgame-screen endgame-screen--${tone}`}
      data-testid="endgame-screen"
      data-tone={tone}
      data-phase={phase}
    >
      {/* Phase 1: Impact glow backdrop */}
      <div className={`endgame-screen__impact ${phase !== 'impact' ? 'endgame-screen__impact--done' : ''}`} />

      {/* Phase 2: Single centered Enemy Waters grid */}
      {showGrid && (
        <div className="endgame-screen__grid" data-testid="endgame-grid">
          <h3 className={`endgame-screen__grid-title endgame-screen__grid-title--${tone}`}>
            {isVictory ? 'Enemy Waters' : 'Your Fleet'}
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

      {/* Phase 4: Hierarchy cascade */}
      {showHierarchy && (
        <div className="endgame-screen__hierarchy" data-testid="endgame-hierarchy">
          {/* Trophy / icon */}
          <div className={`endgame-screen__trophy endgame-screen__trophy--${tone}`}>
            {isVictory ? '🏆' : <span className="endgame-screen__defeat-icon" aria-hidden="true" />}
          </div>

          {/* Title */}
          <h1 className={`endgame-screen__title endgame-screen__title--${tone}`} data-testid="endgame-title">
            {isVictory ? 'VICTORY' : 'DEFEAT'}
          </h1>

          {/* Fleet count */}
          <p className="endgame-screen__fleet-count" data-testid="endgame-fleet-count">
            {isVictory
              ? `You've sunk ${progress.sunk} of ${progress.total} ships`
              : 'Your fleet has been destroyed'}
          </p>

          {/* Medals row — always two balanced medals */}
          <div className="endgame-screen__medals">
            {/* Accuracy medal */}
            <div className={`endgame-screen__medal endgame-screen__medal--${tone}`} data-testid="endgame-accuracy-medal">
              <span className="endgame-screen__medal-icon">🎯</span>
              <span className={`endgame-screen__medal-value endgame-screen__medal-value--${tone}`}>{accuracy.percent}%</span>
              <span className="endgame-screen__medal-label">ACCURACY</span>
            </div>

            {/* Second medal: final blow (victory) or ships sunk (defeat) */}
            {isVictory ? (
              lastSunkShipName && (
                <div className="endgame-screen__medal endgame-screen__medal--victory" data-testid="endgame-finalblow-medal">
                  <span className="endgame-screen__medal-icon">💥</span>
                  <span className="endgame-screen__medal-value endgame-screen__medal-value--victory">{lastSunkShipName.toUpperCase()}</span>
                  <span className="endgame-screen__medal-label">FINAL BLOW</span>
                </div>
              )
            ) : (
              <div className="endgame-screen__medal endgame-screen__medal--defeat" data-testid="endgame-sunk-medal">
                <span className="endgame-screen__medal-icon">💀</span>
                <span className="endgame-screen__medal-value endgame-screen__medal-value--defeat">{enemySunkCount ?? 0} / {progress.total}</span>
                <span className="endgame-screen__medal-label">SHIPS SUNK</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase 5: Action lock — NEW GAME */}
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
