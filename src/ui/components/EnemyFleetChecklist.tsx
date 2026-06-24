import type { ShipStatus } from '../../engine/selectors';

interface EnemyFleetChecklistProps {
  ships: ShipStatus[];
}

export function EnemyFleetChecklist({ ships }: EnemyFleetChecklistProps) {
  return (
    <div data-testid="enemy-fleet-checklist" style={{ marginTop: 8, textAlign: 'left', fontSize: 13 }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {ships.map((ship) => (
          <li
            key={ship.name}
            style={{
              padding: '3px 0',
              color: ship.sunk ? 'var(--text-muted)' : 'var(--text-primary)',
              textDecoration: ship.sunk ? 'line-through' : 'none',
              opacity: ship.sunk ? 0.7 : 1,
            }}
          >
            {ship.sunk ? '\u2620 ' : '\u26f5 '}
            {ship.name} ({ship.length})
            {' \u2014 '}
            <strong style={{ color: ship.sunk ? 'var(--celebrate-sunk)' : 'var(--success-bright)' }}>
              {ship.sunk ? 'SUNK' : 'afloat'}
            </strong>
          </li>
        ))}
      </ul>

    </div>
  );
}
