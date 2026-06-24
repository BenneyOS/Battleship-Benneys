import type { HeaderStatus } from '../headerStatus';

interface TurnBannerProps {
  status: HeaderStatus;
  gamePhase: 'setup' | 'playing' | 'gameOver';
}

export function TurnBanner({ status, gamePhase }: TurnBannerProps) {
  const isPlayer = status.whoseTurn === 'player';
  const color = isPlayer ? 'var(--side-player, #3498db)' : 'var(--side-enemy, #e74c3c)';

  const icon = gamePhase === 'setup'
    ? '\u2693'
    : gamePhase === 'gameOver'
      ? (status.turnTitle === 'VICTORY' ? '\u{1F3C6}' : '\u{1F480}')
      : isPlayer ? '\u271A' : '\u{1F4E1}';

  return (
    <div
      className={`turn-banner turn-banner--${isPlayer ? 'player' : 'computer'}`}
      role="status"
      aria-live="polite"
      data-testid="turn-banner"
    >
      <div className="turn-banner__main">
        <span className="turn-banner__icon" aria-hidden="true">{icon}</span>
        <span className="turn-banner__title" style={{ color }}>
          {status.turnTitle}
        </span>

      </div>
      <div className="turn-banner__prompt">
        {status.prompt}
      </div>
    </div>
  );
}
