import type { SetupProgressData } from '../../engine/selectors';

interface SetupProgressProps {
  progress: SetupProgressData;
}

export function SetupProgress({ progress }: SetupProgressProps) {
  const { placed, total, nextShip, percent } = progress;

  return (
    <div style={{ marginBottom: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 14, marginBottom: 6 }}>
        <strong>{placed} of {total}</strong> ships placed
        {nextShip && (
          <span style={{ color: '#95a5a6', marginLeft: 8 }}>
            Next: {nextShip.name} ({nextShip.length})
          </span>
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
            backgroundColor: percent === 100 ? '#27ae60' : '#2e86c1',
            borderRadius: 4,
            transition: 'width 0.3s ease',
          }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${placed} of ${total} ships placed`}
        />
      </div>
    </div>
  );
}
