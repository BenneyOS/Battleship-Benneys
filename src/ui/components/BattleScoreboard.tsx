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
          <span style={{ color: '#95a5a6' }}> — {remaining} more to go</span>
        )}
      </div>
      <div
        style={{
          width: 240,
          height: 8,
          backgroundColor: '#2c3e50',
          borderRadius: 4,
          overflow: 'hidden',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            backgroundColor: percent === 100 ? '#27ae60' : '#e67e22',
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
      <div style={{ fontSize: 12, color: '#7f8c8d', marginTop: 4 }}>
        {percent}% of the enemy fleet destroyed
      </div>
      {milestoneMessage && (
        <div
          style={{
            marginTop: 8,
            padding: '6px 14px',
            backgroundColor: '#1a3a2a',
            border: '1px solid #27ae60',
            borderRadius: 6,
            fontSize: 13,
            color: '#2ecc71',
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
