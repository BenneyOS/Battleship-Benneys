import { useState, useEffect, useCallback } from 'react';
import { useGameState, SHIP_NAMES } from './app/useGameState';
import { BoardGrid } from './ui/components/BoardGrid';
import { TurnBanner } from './ui/components/TurnBanner';
import { EventLine } from './ui/components/EventLine';
import { SetupProgress } from './ui/components/SetupProgress';
import { BattleScoreboard } from './ui/components/BattleScoreboard';
import { EnemyFleetChecklist } from './ui/components/EnemyFleetChecklist';
import { deriveHeaderStatus } from './ui/headerStatus';
import { FLEET } from './engine/types';
import type { Coord } from './engine/types';
import { setupProgress, fleetProgress, previewPlacement, enemyFleetStatus } from './engine/selectors';
import type { FleetDef, PreviewResult } from './engine/selectors';
import './App.css';

const FLEET_DEF: FleetDef[] = FLEET.map((length, i) => ({
  name: SHIP_NAMES[i],
  length,
}));

function App() {
  const {
    state,
    message,
    placementIndex,
    orientation,
    setOrientation,
    currentShipLength,
    turn,
    aiPhase,
    aiAnnouncement,
    highlightedCell,
    milestoneMessage,
    lastShotResult,
    turnCount,
    actions,
  } = useGameState();

  // Placement preview state
  const [previewAnchor, setPreviewAnchor] = useState<Coord | null>(null);
  const [touchAnchor, setTouchAnchor] = useState<Coord | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        setOrientation((o) => (o === 'horizontal' ? 'vertical' : 'horizontal'));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setOrientation]);

  const isSetup = state.game.phase === 'setup';
  const isPlaying = state.game.phase === 'playing';
  const isGameOver = state.game.phase === 'gameOver';
  const allShipsPlaced = placementIndex >= FLEET.length;

  // Derive progress data from board state
  const setupProg = setupProgress(state.game.humanBoard, FLEET_DEF);
  const battleProg = fleetProgress(state.game.aiBoard);
  const enemyShipStatus = enemyFleetStatus(state.game.aiBoard);

  // Derive header view-model from existing state
  const headerStatus = deriveHeaderStatus(
    turn,
    aiPhase,
    state.game.phase,
    lastShotResult,
    state.game.winner as 'human' | 'ai' | null | undefined,
  );

  // Compute preview based on current hover anchor
  const preview: PreviewResult | null =
    isSetup && !allShipsPlaced && previewAnchor && currentShipLength
      ? previewPlacement(state.game.humanBoard, previewAnchor, currentShipLength, orientation)
      : null;

  // Enemy grid is interactive only when it's human's turn and AI is idle
  const enemyGridInteractive = isPlaying && turn === 'human' && aiPhase === 'idle';

  const handleCellHover = useCallback((coord: Coord) => {
    setPreviewAnchor(coord);
  }, []);

  const handleBoardLeave = useCallback(() => {
    setPreviewAnchor(null);
    setTouchAnchor(null);
  }, []);

  const handleSetupClick = useCallback((coord: Coord) => {
    if (!currentShipLength) return;

    // Touch support: first tap previews, second tap on same anchor commits
    const isTouchDevice = 'ontouchstart' in window;
    if (isTouchDevice) {
      if (touchAnchor && touchAnchor.x === coord.x && touchAnchor.y === coord.y) {
        // Second tap on same anchor — commit if valid
        const p = previewPlacement(state.game.humanBoard, coord, currentShipLength, orientation);
        if (p.isValid) {
          actions.placeShip({ origin: coord, orientation, length: currentShipLength });
          setPreviewAnchor(null);
          setTouchAnchor(null);
        }
      } else {
        // First tap or different cell — set preview
        setTouchAnchor(coord);
        setPreviewAnchor(coord);
      }
      return;
    }

    // Desktop: click commits if valid (preview already showing)
    const p = previewPlacement(state.game.humanBoard, coord, currentShipLength, orientation);
    if (p.isValid) {
      actions.placeShip({ origin: coord, orientation, length: currentShipLength });
      setPreviewAnchor(null);
    }
    // Invalid click is a no-op
  }, [currentShipLength, orientation, state.game.humanBoard, actions, touchAnchor]);

  return (
    <div className="game-layout">
      {/* ===== CENTRAL HEADER BAR ===== */}
      <header className="zone-header" data-testid="zone-header">
        <h1 style={{ fontSize: 28, margin: '0 0 4px', letterSpacing: 2 }}>
          BATTLESHIP
        </h1>
        <p style={{ color: '#7f8c8d', margin: '0 0 12px', fontSize: 13 }}>
          Benney's Edition
        </p>

        {/* PRIMARY: Turn Banner (non-interactive, animated handoff) */}
        <TurnBanner
          status={headerStatus}
          turnCount={turnCount}
          gamePhase={state.game.phase}
        />

        {/* SECONDARY: Last-event line (tiered emphasis) */}
        <EventLine
          lastEvent={headerStatus.lastEvent}
          eventTier={headerStatus.eventTier}
        />

        {/* Setup controls in header */}
        {isSetup && (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              onClick={actions.autoPlaceHumanFleet}
              style={buttonStyle}
            >
              Auto-Place Ships
            </button>
            {allShipsPlaced && (
              <button onClick={actions.startPlaying} style={buttonStylePrimary}>
                Start Game
              </button>
            )}
            {!allShipsPlaced && (
              <span style={{ color: '#95a5a6', fontSize: 13, lineHeight: '36px' }}>
                Orientation: <strong>{orientation}</strong> (press R to toggle)
              </span>
            )}
          </div>
        )}

        {isGameOver && (
          <button onClick={actions.reset} style={{ ...buttonStylePrimary, marginTop: 10 }}>
            New Game
          </button>
        )}
      </header>

      {/* ===== PLAYER ZONE (LEFT) ===== */}
      <section className="zone-player" data-testid="zone-player">
        <div className="zone-label">
          <span>&#9875;</span> Your Side
        </div>

        <div className="board-container">
          <BoardGrid
            board={state.game.humanBoard}
            showShips={true}
            onClick={isSetup && !allShipsPlaced ? handleSetupClick : undefined}
            onCellHover={isSetup && !allShipsPlaced ? handleCellHover : undefined}
            onBoardLeave={isSetup && !allShipsPlaced ? handleBoardLeave : undefined}
            label="Your Fleet"
            interactive={isSetup && !allShipsPlaced}
            highlightedCell={highlightedCell}
            preview={preview}
          />
        </div>

        {/* Companion panel: setup progress */}
        {isSetup && (
          <div className="companion-panel" data-testid="player-companion-panel">
            <SetupProgress progress={setupProg} />
            {/* Ship placement queue */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
              {FLEET.map((length, i) => (
                <div
                  key={i}
                  style={{
                    padding: '3px 10px',
                    borderRadius: 4,
                    backgroundColor: i < placementIndex ? '#27ae60' : i === placementIndex ? '#2e86c1' : '#2c3e50',
                    fontSize: 12,
                    color: '#ecf0f1',
                  }}
                >
                  {SHIP_NAMES[i]} ({length})
                  {i < placementIndex ? ' \u2713' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Companion panel: player fleet damage during play */}
        {(isPlaying || isGameOver) && (
          <div className="companion-panel" data-testid="player-companion-panel">
            <div style={{ fontSize: 13, color: '#95a5a6', textAlign: 'center' }}>
              Your fleet: {state.game.humanBoard.ships.filter((s) => {
                const cells = Array.from({ length: s.length }, (_, i) =>
                  s.orientation === 'horizontal'
                    ? `${s.origin.x + i},${s.origin.y}`
                    : `${s.origin.x},${s.origin.y + i}`
                );
                return cells.every((c) => state.game.humanBoard.shots.has(c));
              }).length} lost
            </div>
          </div>
        )}
      </section>

      {/* ===== ENEMY ZONE (RIGHT) ===== */}
      <section className="zone-enemy" data-testid="zone-enemy">
        <div className="zone-label">
          <span>&#127919;</span> Enemy Side
        </div>

        <div className="board-container">
          <BoardGrid
            board={state.game.aiBoard}
            showShips={false}
            onClick={enemyGridInteractive ? actions.fire : undefined}
            label="Enemy Waters"
            interactive={enemyGridInteractive}
          />
        </div>

        {/* Companion panel: enemy fleet damage + checklist */}
        {(isPlaying || isGameOver) && (
          <div className="companion-panel" data-testid="enemy-companion-panel">
            <BattleScoreboard progress={battleProg} milestoneMessage={milestoneMessage} />
            <EnemyFleetChecklist ships={enemyShipStatus} />
          </div>
        )}
      </section>

      {/* Legend — below the grid zones */}
      {(isPlaying || isGameOver) && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '12px 0', gap: 16, fontSize: 12, color: '#7f8c8d' }}>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#3a4a5a', verticalAlign: 'middle', marginRight: 4, border: '1px solid #2c3e50' }} />
            Miss
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#c0392b', verticalAlign: 'middle', marginRight: 4, border: '1px solid #2c3e50' }} />
            Hit
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#7b241c', verticalAlign: 'middle', marginRight: 4, border: '1px solid #2c3e50' }} />
            Sunk
          </span>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '8px 18px',
  fontSize: 14,
  border: '1px solid #4a6fa5',
  borderRadius: 6,
  backgroundColor: '#1b2838',
  color: '#ecf0f1',
  cursor: 'pointer',
};

const buttonStylePrimary: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#2e86c1',
  borderColor: '#2e86c1',
  fontWeight: 600,
};

export default App;
