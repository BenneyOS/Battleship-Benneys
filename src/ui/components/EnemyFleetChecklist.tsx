import type { ShipStatus } from '../../engine/selectors';

interface EnemyFleetChecklistProps {
  ships: ShipStatus[];
}

export function EnemyFleetChecklist({ ships }: EnemyFleetChecklistProps) {
  const afloat = ships.filter((s) => !s.sunk);

  return (
    <div data-testid="enemy-fleet-checklist" style={{ marginTop: 8, textAlign: 'left', fontSize: 13 }}>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {ships.map((ship) => (
          <li
            key={ship.name}
            style={{
              padding: '3px 0',
              color: ship.sunk ? '#7f8c8d' : '#ecf0f1',
              textDecoration: ship.sunk ? 'line-through' : 'none',
              opacity: ship.sunk ? 0.7 : 1,
            }}
          >
            {ship.sunk ? '\u2620 ' : '\u26f5 '}
            {ship.name} ({ship.length})
            {' \u2014 '}
            <strong style={{ color: ship.sunk ? '#e74c3c' : '#2ecc71' }}>
              {ship.sunk ? 'SUNK' : 'afloat'}
            </strong>
          </li>
        ))}
      </ul>
      {afloat.length > 0 && afloat.length < ships.length && (
        <div style={{ marginTop: 6, fontSize: 12, color: '#95a5a6' }}>
          Still afloat: {afloat.map((s) => s.name).join(', ')}
        </div>
      )}
    </div>
  );
}
