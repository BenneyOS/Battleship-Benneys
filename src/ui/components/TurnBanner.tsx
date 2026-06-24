import type { Turn, AiPhase } from '../../app/useGameState';

interface TurnBannerProps {
  turn: Turn;
  aiPhase: AiPhase;
  aiAnnouncement: string | null;
  gamePhase: 'setup' | 'playing' | 'gameOver';
}

export function TurnBanner({ turn, aiPhase, aiAnnouncement, gamePhase }: TurnBannerProps) {
  if (gamePhase !== 'playing') return null;

  const isHumanTurn = turn === 'human' && aiPhase === 'idle';

  const icon = isHumanTurn ? '\u271A' : '\u{1F4E1}';
  const color = isHumanTurn ? '#3498db' : '#e74c3c';
  const text = isHumanTurn
    ? 'Your turn \u2014 fire at the enemy grid'
    : aiPhase === 'aiming'
      ? 'Computer is taking aim\u2026'
      : aiAnnouncement ?? "Computer's turn";

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 20px',
        borderRadius: 8,
        backgroundColor: isHumanTurn ? '#1a3a5c' : '#3c1a1a',
        border: `2px solid ${color}`,
        marginBottom: 12,
        fontSize: 15,
        fontWeight: 500,
      }}
    >
      <span style={{ fontSize: 20 }} aria-hidden="true">{icon}</span>
      <span style={{ color }}>{text}</span>
    </div>
  );
}
