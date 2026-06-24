import type { EventTier } from '../headerStatus';

interface EventLineProps {
  lastEvent: string | null;
  eventTier: EventTier | null;
}

export function EventLine({ lastEvent, eventTier }: EventLineProps) {
  if (!lastEvent) return null;

  const tierClass = eventTier ? `event-line--${eventTier}` : '';

  return (
    <div
      className={`event-line ${tierClass}`}
      aria-live="polite"
      data-testid="event-line"
    >
      {eventTier === 'sunk' && (
        <span className="event-line__callout" aria-hidden="true">
          {lastEvent.includes('Sunk') ? lastEvent.split(' \u2014 ').pop()?.replace('!', '').toUpperCase() + '!' : 'SUNK!'}
        </span>
      )}
      <span className="event-line__text">{lastEvent}</span>
    </div>
  );
}
