import { useState, useEffect, useCallback } from 'react';
import { useGameState, SHIP_NAMES } from './app/useGameState';
import { BoardGrid } from './ui/components/BoardGrid';
import { TurnBanner } from './ui/components/TurnBanner';
import { EventLine } from './ui/components/EventLine';
import { SetupProgress } from './ui/components/SetupProgress';
import { BattleScoreboard } from './ui/components/BattleScoreboard';
import { EnemyFleetChecklist } from './ui/components/EnemyFleetChecklist';
import { AccuracyChip } from './ui/components/AccuracyChip';
import { MuteButton } from './ui/components/MuteButton';
import { Celebrate } from './ui/components/Celebrate';
import { unlockAudio } from './ui/audioContext';
import { VictoryScreen } from './ui/components/VictoryScreen';
import { LogoHeader } from './ui/components/LogoHeader';
import { deriveHeaderStatus } from './ui/headerStatus';
import { deriveCelebrationFromShot, buildCelebration } from './ui/celebrationSystem';
import type { CelebrationEvent } from './ui/celebrationSystem';
import { FLEET } from './engine/types';
import type { Coord } from './engine/types';
import { setupProgress, fleetProgress, playerAccuracy, previewPlacement, enemyFleetStatus } from './engine/selectors';
import type { FleetDef, PreviewResult } from './engine/selectors';
import './App.css';

const FLEET_DEF: FleetDef[] = FLEET.map((length, i) => ({
  name: SHIP_NAMES[i],
  length,
}));

function App() {
  const {
    state,
    placementIndex,
    orientation,
    setOrientation,
    currentShipLength,
    turn,
    aiPhase,
    highlightedCell,
    milestoneMessage,
    lastShotResult,
    actions,
  } = useGameState();

  // Mute control — persists across the session via state
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem('battleship-muted') === 'true'; } catch { return false; }
  });
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem('battleship-muted', String(next)); } catch { /* noop */ }
      return next;
    });
  }, []);

  // Placement preview state
  const [previewAnchor, setPreviewAnchor] = useState<Coord | null>(null);
  const [touchAnchor, setTouchAnchor] = useState<Coord | null>(null);

  // Fleet-ready beat tracking
  const [fleetReadyFired, setFleetReadyFired] = useState(false);

  // Celebration event — shared across all tiers
  const [celebrationEvent, setCelebrationEvent] = useState<CelebrationEvent | null>(null);

  // Track last sunk ship name for victory medal
  const [lastSunkShip, setLastSunkShip] = useState<string | null>(null);

  // Previous value tracking for render-time change detection
  const [prevShot, setPrevShot] = useState(lastShotResult);
  const [prevMilestoneMsg, setPrevMilestoneMsg] = useState(milestoneMessage);
  const [prevIsDefeat, setPrevIsDefeat] = useState(false);

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
  const isVictory = isGameOver && state.game.winner === 'human';
  const isDefeat = isGameOver && state.game.winner === 'ai';

  // Derive progress data from board state
  const setupProg = setupProgress(state.game.humanBoard, FLEET_DEF);
  const battleProg = fleetProgress(state.game.aiBoard);
  const accuracy = playerAccuracy(state.game.aiBoard);
  const enemyShipStatus = enemyFleetStatus(state.game.aiBoard);

  // Derive header view-model from existing state
  const headerStatus = deriveHeaderStatus(
    turn,
    aiPhase,
    state.game.phase,
    lastShotResult,
    state.game.winner as 'human' | 'ai' | null | undefined,
  );

  // --- Celebration derivation (render-time change detection — no setState in effects) ---

  // Shot-based celebration (micro hit / sink / victory)
  if (lastShotResult !== prevShot) {
    setPrevShot(lastShotResult);
    const shotCeleb = deriveCelebrationFromShot(lastShotResult, battleProg);
    if (shotCeleb) {
      if ((shotCeleb.tier === 'sink' || shotCeleb.tier === 'victory') && lastShotResult?.sunkShipName) {
        setLastSunkShip(lastShotResult.sunkShipName);
      }
      setCelebrationEvent(shotCeleb);
    } else if (lastShotResult?.actor === 'computer' && lastShotResult.outcome === 'hit') {
      setCelebrationEvent(buildCelebration('micro', 'HIT'));
    }
  }

  // Milestone celebration — milestoneMessage change IS the signal
  if (milestoneMessage !== prevMilestoneMsg) {
    setPrevMilestoneMsg(milestoneMessage);
    if (milestoneMessage) {
      setCelebrationEvent(buildCelebration('milestone', milestoneMessage));
    }
  }

  // Fleet-ready beat (phase-complete)
  if (isSetup && allShipsPlaced && !fleetReadyFired) {
    setFleetReadyFired(true);
    setCelebrationEvent(buildCelebration('phase-complete', 'FLEET READY'));
  }

  // Defeat celebration
  if (isDefeat && !prevIsDefeat) {
    setPrevIsDefeat(true);
    setCelebrationEvent(buildCelebration('defeat', 'DEFEAT'));
  }

  // Compute preview based on current hover anchor
  const preview: PreviewResult | null =
    isSetup && !allShipsPlaced && previewAnchor && currentShipLength
      ? previewPlacement(state.game.humanBoard, previewAnchor, currentShipLength, orientation)
      : null;

  // Unlock audio on any click within the game layout (covers Start Game, fire, etc.)
  const handleLayoutClick = useCallback(() => { unlockAudio(); }, []);

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
    unlockAudio();
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

  const handleReset = useCallback(() => {
    actions.reset();
    setFleetReadyFired(false);
    setCelebrationEvent(null);
    setLastSunkShip(null);
    setPrevShot(null);
    setPrevMilestoneMsg(null);
    setPrevIsDefeat(false);
  }, [actions]);

  // --- Victory/Defeat screen ---
  if (isGameOver) {
    return (
      <div className="game-layout" data-phase="gameOver" onClick={handleLayoutClick}>
        {/* Atmosphere layers */}
        <div className="atmosphere-texture" aria-hidden="true" />
        <div className="atmosphere-shimmer" aria-hidden="true" />

        <VictoryScreen
          board={state.game.aiBoard}
          fleetProgress={battleProg}
          accuracy={accuracy}
          enemyShips={enemyShipStatus}
          lastSunkShipName={lastSunkShip}
          isVictory={isVictory}
          onNewGame={handleReset}
        />

        {/* Mute control */}
        <div style={{ position: 'fixed', bottom: 16, right: 16, zIndex: 200 }}>
          <MuteButton muted={muted} onToggle={toggleMute} />
        </div>

        {/* Celebration overlay — routes through ONE shared component */}
        <Celebrate event={celebrationEvent} muted={muted} />
      </div>
    );
  }

  return (
    <div className="game-layout" data-phase={state.game.phase} onClick={handleLayoutClick}>
      {/* Atmosphere layers */}
      <div className="atmosphere-texture" aria-hidden="true" />
      <div className="atmosphere-shimmer" aria-hidden="true" />

      {/* ===== CENTRAL HEADER BAR ===== */}
      <header className="zone-header" data-testid="zone-header">
        {/* CSS/HTML Logo — no raster image */}
        <LogoHeader />

        {/* PRIMARY: Turn Banner (non-interactive, animated handoff) */}
        <TurnBanner
          status={headerStatus}
          gamePhase={state.game.phase}
        />

        {/* ACCURACY CHIP: own zone outside the banner */}
        <AccuracyChip accuracy={accuracy} gamePhase={state.game.phase} />

        {/* SECONDARY: Last-event line (tiered emphasis) */}
        <EventLine
          lastEvent={headerStatus.lastEvent}
          eventTier={headerStatus.eventTier}
        />

        {/* Mute control */}
        {isPlaying && (
          <MuteButton muted={muted} onToggle={toggleMute} />
        )}
      </header>

      {/* ===== PLAYER ZONE (LEFT) ===== */}
      <section className="zone-player" data-testid="zone-player">
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
                    backgroundColor: i < placementIndex ? 'var(--success)' : i === placementIndex ? 'var(--side-player)' : 'var(--board-bg)',
                    fontSize: 12,
                    fontFamily: 'var(--font-body)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {SHIP_NAMES[i]} ({length})
                  {i < placementIndex ? ' \u2713' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Anchored CTAs: bottom of setup zone */}
        {isSetup && (
          <div className="setup-cta-zone">
            {!allShipsPlaced && (
              <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', fontSize: 13 }}>
                Orientation: <strong>{orientation}</strong> (press R to toggle)
              </span>
            )}
            <button
              onClick={actions.autoPlaceHumanFleet}
              className="btn-secondary"
            >
              Auto-Place Ships
            </button>
            {allShipsPlaced && (
              <button onClick={actions.startPlaying} className="btn-primary btn-start-game" style={{ borderRadius: 6 }}>
                Start Game
              </button>
            )}
          </div>
        )}

        {/* Companion panel: player fleet damage during play */}
        {isPlaying && (
          <div className="companion-panel" data-testid="player-companion-panel">
            <div style={{ fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text-secondary)', textAlign: 'center' }}>
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
        {isPlaying && (
          <div className="companion-panel" data-testid="enemy-companion-panel">
            <BattleScoreboard progress={battleProg} milestoneMessage={milestoneMessage} />
            <EnemyFleetChecklist ships={enemyShipStatus} />
          </div>
        )}
      </section>

      {/* Legend — below the grid zones */}
      {isPlaying && (
        <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: '12px 0', gap: 16, fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: 'var(--state-miss)', verticalAlign: 'middle', marginRight: 4, border: '1px solid var(--surface-edge)' }} />
            Miss
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: 'var(--state-hit)', verticalAlign: 'middle', marginRight: 4, border: '1px solid var(--surface-edge)', boxShadow: '0 0 6px var(--state-hit)' }} />
            Hit
          </span>
          <span>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: 'var(--state-sunk)', verticalAlign: 'middle', marginRight: 4, border: '1px solid var(--surface-edge)', boxShadow: '0 0 6px var(--state-sunk)' }}>
              <span style={{ fontSize: 10, lineHeight: '14px', display: 'block', textAlign: 'center' }}>☠</span>
            </span>
            Sunk
          </span>
        </div>
      )}

      {/* Celebration overlay — ONE shared component for ALL tiers */}
      <Celebrate event={celebrationEvent} muted={muted} />
    </div>
  );
}

export default App;
