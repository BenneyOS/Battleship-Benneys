import type { FleetProgressData } from '../../engine/selectors';

interface BattleScoreboardProps {
  progress: FleetProgressData;
  milestoneMessage: string | null;
}

export function BattleScoreboard({ progress, milestoneMessage }: BattleScoreboardProps) {
  const { sunk, remaining, total, percent } = progress;

  return (
    <div style={{ marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        You've sunk <strong>{sunk} of {total}</strong> ships
        {remaining > 0 && (
          <span style={{ color: 'var(--text-secondary)' }}> — {remaining} more to go</span>
        )}
      </div>
      <div
        style={{
          width: 240,
          height: 8,
          backgroundColor: 'var(--surface-edge)',
          borderRadius: 4,
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: percent === 100 ? 'var(--success)' : 'var(--celebrate-hit)',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${percent}% of enemy fleet destroyed`}
        />
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
        {percent}% of the enemy fleet destroyed
      </div>
      {milestoneMessage && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 14px',
            backgroundColor: 'rgba(39, 174, 96, 0.12)',
            border: '1px solid var(--success)',
            borderRadius: 6,
            fontSize: 13,
            color: 'var(--success-bright)',
            fontWeight: 500,
          }}
          role="alert"
        >
          {milestoneMessage}
        </div>
      )}
    </div>
  );
}
