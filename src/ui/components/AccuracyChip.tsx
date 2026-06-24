import { useRef, useEffect, useState } from 'react';
import type { AccuracyData } from '../../engine/selectors';

interface AccuracyChipProps {
  accuracy: AccuracyData;
  gamePhase: 'setup' | 'playing' | 'gameOver';
}

export function AccuracyChip({ accuracy, gamePhase }: AccuracyChipProps) {
  const prevPercent = useRef(accuracy.percent);
  const [pulseClass, setPulseClass] = useState('');

  useEffect(() => {
    if (accuracy.percent > prevPercent.current) {
      setPulseClass('accuracy-chip--rising');
    } else if (accuracy.shots > 0 && accuracy.percent <= prevPercent.current) {
      setPulseClass('accuracy-chip--tick');
    }
    prevPercent.current = accuracy.percent;

    const timer = setTimeout(() => setPulseClass(''), 600);
    return () => clearTimeout(timer);
  }, [accuracy.percent, accuracy.shots]);

  if (gamePhase !== 'playing' && gamePhase !== 'gameOver') return null;

  const displayValue = accuracy.shots === 0 ? '—' : `${accuracy.percent}%`;

  return (
    <div
      className={`accuracy-chip ${pulseClass}`}
      data-testid="accuracy-chip"
      aria-label={`Accuracy: ${accuracy.shots === 0 ? 'no shots fired' : `${accuracy.percent} percent`}`}
    >
      <span className="accuracy-chip__icon" aria-hidden="true">🎯</span>
      <span className="accuracy-chip__value">{displayValue}</span>
      <span className="accuracy-chip__label">ACCURACY</span>
    </div>
  );
}
