import { useState, useEffect, useRef } from 'react';
import type { Board } from '../../engine/types';
import { BOARD_SIZE } from '../../engine/types';
import { getCellState } from '../../engine/board';
import type { FleetProgressData, AccuracyData, ShipStatus } from '../../engine/selectors';

// ─── SVG Ship Silhouettes ────────────────────────────────────────────────────

const SHIP_SVGS: Record<string, { path: string; width: number; height: number }> = {
  Carrier: {
    path: 'M2 8 Q2 4 6 4 L44 4 Q48 4 48 8 L48 12 Q48 16 44 16 L6 16 Q2 16 2 12 Z M10 7 L40 7 L40 13 L10 13 Z',
    width: 50,
    height: 20,
  },
  Battleship: {
    path: 'M3 8 L8 3 L32 3 Q38 3 38 8 L38 12 Q38 17 32 17 L8 17 L3 12 Z M10 6 L32 6 L32 14 L10 14 Z',
    width: 40,
    height: 20,
  },
  Cruiser: {
    path: 'M2 10 L8 4 L22 4 Q28 4 28 10 Q28 16 22 16 L8 16 L2 10 Z',
    width: 30,
    height: 20,
  },
  Submarine: {
    path: 'M4 10 Q4 5 10 5 L20 5 Q26 5 26 10 Q26 15 20 15 L10 15 Q4 15 4 10 Z M12 3 L14 3 L14 5 L12 5 Z',
    width: 30,
    height: 20,
  },
  Destroyer: {
    path: 'M2 10 L6 5 L14 5 Q18 5 18 10 Q18 15 14 15 L6 15 L2 10 Z',
    width: 20,
    height: 20,
  },
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface VictoryScreenProps {
  board: Board;
  fleetProgress: FleetProgressData;
  accuracy: AccuracyData;
  enemyShips: ShipStatus[];
  lastSunkShipName: string | null;
  isVictory: boolean;
  onNewGame: () => void;
  /** Override all timing to 0 in tests */
  animationMs?: number;
}

type CascadePhase = 'impact' | 'grid' | 'silhouettes' | 'hierarchy' | 'action';

const COLUMN_LABELS = 'ABCDEFGHIJ';

// ─── Component ───────────────────────────────────────────────────────────────

export function VictoryScreen({
  board,
  fleetProgress: progress,
  accuracy,
  enemyShips,
  lastSunkShipName,
  isVictory,
  onNewGame,
  animationMs,
}: VictoryScreenProps) {
  const [phase, setPhase] = useState<CascadePhase>('impact');
  const phaseTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const duration = animationMs ?? 600;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Sequenced cascade: impact → grid → silhouettes → hierarchy → action
    timers.push(setTimeout(() => setPhase('grid'), duration));
    timers.push(setTimeout(() => setPhase('silhouettes'), duration * 2));
    timers.push(setTimeout(() => setPhase('hierarchy'), duration * 3));
    timers.push(setTimeout(() => setPhase('action'), duration * 4));

    phaseTimers.current = timers;
    return () => timers.forEach(clearTimeout);
  }, [duration]);

  const phaseIdx = ['impact', 'grid', 'silhouettes', 'hierarchy', 'action'].indexOf(phase);
  const showGrid = phaseIdx >= 1;
  const showSilhouettes = phaseIdx >= 2;
  const showHierarchy = phaseIdx >= 3;
  const showAction = phaseIdx >= 4;

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
            Enemy Waters
          </h3>
          <table className="endgame-screen__table">
            <thead>
              <tr>
                <th style={{ width: 24, height: 24 }} />
                {Array.from({ length: BOARD_SIZE }, (_, i) => (
                  <th key={i} className="endgame-screen__coord">
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

          {/* Phase 3: SVG silhouettes over sunk ships */}
          {showSilhouettes && (
            <div className="endgame-screen__silhouettes" data-testid="endgame-silhouettes">
              {board.ships.map((ship, i) => {
                const name = enemyShips[i]?.name ?? `Ship ${i + 1}`;
                const svg = SHIP_SVGS[name];
                if (!svg) return null;

                const cellSize = 28;
                const headerOffset = 24;
                const left = ship.origin.x * cellSize + headerOffset;
                const top = ship.origin.y * cellSize + headerOffset;
                const w = ship.orientation === 'horizontal' ? ship.length * cellSize : cellSize;
                const h = ship.orientation === 'vertical' ? ship.length * cellSize : cellSize;

                return (
                  <svg
                    key={i}
                    className={`endgame-screen__ship-svg endgame-screen__ship-svg--${tone}`}
                    data-testid={`ship-silhouette-${name.toLowerCase()}`}
                    viewBox={`0 0 ${svg.width} ${svg.height}`}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: w,
                      height: h,
                      transform: ship.orientation === 'vertical' ? 'rotate(90deg)' : undefined,
                      transformOrigin: ship.orientation === 'vertical' ? `${cellSize / 2}px ${cellSize / 2}px` : undefined,
                    }}
                    aria-label={`${name} silhouette`}
                  >
                    <path d={svg.path} />
                  </svg>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Phase 4: Hierarchy cascade */}
      {showHierarchy && (
        <div className="endgame-screen__hierarchy" data-testid="endgame-hierarchy">
          {/* Trophy */}
          <div className={`endgame-screen__trophy endgame-screen__trophy--${tone}`}>
            {isVictory ? '🏆' : '⚓'}
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

          {/* Medals row */}
          <div className="endgame-screen__medals">
            {/* Accuracy medal */}
            <div className={`endgame-screen__medal endgame-screen__medal--${tone}`} data-testid="endgame-accuracy-medal">
              <span className="endgame-screen__medal-icon">🎯</span>
              <span className="endgame-screen__medal-value">{accuracy.percent}%</span>
              <span className="endgame-screen__medal-label">ACCURACY</span>
            </div>

            {/* Final blow medal (victory only) */}
            {isVictory && lastSunkShipName && (
              <div className="endgame-screen__medal endgame-screen__medal--victory" data-testid="endgame-finalblow-medal">
                <span className="endgame-screen__medal-icon">💥</span>
                <span className="endgame-screen__medal-value">{lastSunkShipName.toUpperCase()}</span>
                <span className="endgame-screen__medal-label">FINAL BLOW</span>
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
