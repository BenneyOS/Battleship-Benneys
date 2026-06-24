import { useEffect } from 'react';
import { useGameState, SHIP_NAMES } from './app/useGameState';
import { BoardGrid } from './ui/components/BoardGrid';
import { TurnBanner } from './ui/components/TurnBanner';
import { SetupProgress } from './ui/components/SetupProgress';
import { BattleScoreboard } from './ui/components/BattleScoreboard';
import { FLEET } from './engine/types';
import type { Coord } from './engine/types';
import { setupProgress, fleetProgress } from './engine/selectors';
import type { FleetDef } from './engine/selectors';

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
    actions,
  } = useGameState();

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

  // Enemy grid is interactive only when it's human's turn and AI is idle
  const enemyGridInteractive = isPlaying && turn === 'human' && aiPhase === 'idle';

  const handleSetupClick = (coord: Coord) => {
    if (currentShipLength) {
      actions.placeShip({ origin: coord, orientation, length: currentShipLength });
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0d1b2a',
        color: '#ecf0f1',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px',
      }}
    >
      <h1 style={{ fontSize: 28, margin: '0 0 4px', letterSpacing: 2 }}>
        BATTLESHIP
      </h1>
      <p style={{ color: '#7f8c8d', margin: '0 0 16px', fontSize: 13 }}>
        Benney's Edition
      </p>

      {/* Turn Banner — visible during play */}
      <TurnBanner
        turn={turn}
        aiPhase={aiPhase}
        aiAnnouncement={aiAnnouncement}
        gamePhase={state.game.phase}
      />

      {/* Setup Progress Bar */}
      {isSetup && <SetupProgress progress={setupProg} />}

      {/* Battle Scoreboard */}
      {(isPlaying || isGameOver) && (
        <BattleScoreboard progress={battleProg} milestoneMessage={milestoneMessage} />
      )}

      {/* Message area */}
      <div
        style={{
          backgroundColor: '#1b2838',
          padding: '10px 24px',
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 15,
          maxWidth: 600,
          textAlign: 'center',
        }}
      >
        {message}
      </div>

      {/* AI Announcement — aria-live for screen readers */}
      {aiAnnouncement && (
        <div
          aria-live="polite"
          style={{
            backgroundColor: '#2c1a1a',
            padding: '8px 18px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 14,
            color: '#e74c3c',
            fontWeight: 500,
            border: '1px solid #e74c3c',
          }}
        >
          {aiAnnouncement}
        </div>
      )}

      {isSetup && (
        <div style={{ marginBottom: 12, display: 'flex', gap: 10 }}>
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
        <button onClick={actions.reset} style={buttonStylePrimary}>
          New Game
        </button>
      )}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 24,
          marginTop: 8,
        }}
      >
        <BoardGrid
          board={state.game.humanBoard}
          showShips={true}
          onClick={isSetup && !allShipsPlaced ? handleSetupClick : undefined}
          label="Your Fleet"
          interactive={isSetup && !allShipsPlaced}
          highlightedCell={highlightedCell}
        />

        <BoardGrid
          board={state.game.aiBoard}
          showShips={false}
          onClick={enemyGridInteractive ? actions.fire : undefined}
          label="Enemy Waters"
          interactive={enemyGridInteractive}
        />
      </div>

      {isSetup && (
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {FLEET.map((length, i) => (
            <div
              key={i}
              style={{
                padding: '4px 12px',
                borderRadius: 4,
                backgroundColor: i < placementIndex ? '#27ae60' : i === placementIndex ? '#2e86c1' : '#2c3e50',
                fontSize: 13,
                color: '#ecf0f1',
              }}
            >
              {SHIP_NAMES[i]} ({length})
              {i < placementIndex ? ' \u2713' : ''}
            </div>
          ))}
        </div>
      )}

      {(isPlaying || isGameOver) && (
        <div style={{ marginTop: 16, fontSize: 12, color: '#7f8c8d' }}>
          <span style={{ marginRight: 16 }}>
            <span style={{ display: 'inline-block', width: 14, height: 14, backgroundColor: '#3a4a5a', verticalAlign: 'middle', marginRight: 4, border: '1px solid #2c3e50' }} />
            Miss
          </span>
          <span style={{ marginRight: 16 }}>
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
