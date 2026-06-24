import { useEffect, useState, useRef } from 'react';
import type { SinkCelebrationData } from '../sinkCelebration';

interface SinkCelebrationProps {
  celebration: SinkCelebrationData | null;
  muted: boolean;
  /** Override animation durations (0 in tests) */
  animationMs?: number;
}

/** Generate particles for the burst effect */
function generateParticles(intensity: number): { id: number; angle: number; distance: number; size: number }[] {
  const count = 6 + intensity * 4;
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 20 - 10,
    distance: 40 + intensity * 15 + Math.random() * 30,
    size: 3 + intensity * 0.5 + Math.random() * 2,
  }));
}

/** Play a short celebration tone via Web Audio API */
function playCelebrationSound(intensity: number): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'triangle';
    // Higher pitch for more intense celebrations
    osc.frequency.setValueAtTime(440 + intensity * 80, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(660 + intensity * 120, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3 + intensity * 0.05);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4 + intensity * 0.05);

    osc.onended = () => ctx.close();
  } catch {
    // Audio unavailable — celebration still reads visually
  }
}

export function SinkCelebration({ celebration, muted, animationMs }: SinkCelebrationProps) {
  const [phase, setPhase] = useState<'idle' | 'cascade' | 'callout' | 'glow' | 'settle'>('idle');
  const [particles, setParticles] = useState<ReturnType<typeof generateParticles>>([]);
  const prevCelebrationRef = useRef<SinkCelebrationData | null>(null);
  const duration = animationMs ?? 400;

  useEffect(() => {
    // Only trigger on a NEW celebration (not on re-render with same data)
    if (!celebration || celebration === prevCelebrationRef.current) return;
    prevCelebrationRef.current = celebration;

    const intensity = celebration.intensityLevel;
    setParticles(generateParticles(intensity));

    // Phase 1: cascade
    setPhase('cascade');

    // Sound (gated by mute)
    if (!muted) {
      playCelebrationSound(intensity);
    }

    // Phase 2: callout
    const t1 = setTimeout(() => setPhase('callout'), duration);

    // Phase 3: glow + particles
    const t2 = setTimeout(() => setPhase('glow'), duration * 2);

    // Phase 4: settle
    const t3 = setTimeout(() => setPhase('settle'), duration * 4);

    // Phase 5: idle
    const t4 = setTimeout(() => setPhase('idle'), duration * 5);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [celebration, muted, duration]);

  if (phase === 'idle' || !celebration) return null;

  const intensity = celebration.intensityLevel;
  const isFinal = celebration.isFinalShip;
  const glowOpacity = Math.min(0.15 + intensity * 0.08, 0.6);
  const calloutText = isFinal
    ? 'VICTORY — ALL SHIPS DESTROYED!'
    : `${celebration.sunkShipName.toUpperCase()} DOWN!`;

  return (
    <div
      className={`sink-celebration sink-celebration--${phase} ${isFinal ? 'sink-celebration--finale' : ''}`}
      data-testid="sink-celebration"
      data-phase={phase}
      data-intensity={intensity}
      aria-live="assertive"
      role="alert"
    >
      {/* Screen-edge glow */}
      {(phase === 'glow' || phase === 'settle') && (
        <div
          className="sink-celebration__glow"
          data-testid="sink-glow"
          style={{
            boxShadow: `inset 0 0 ${30 + intensity * 15}px ${10 + intensity * 5}px rgba(${isFinal ? '255, 215, 0' : '220, 20, 60'}, ${glowOpacity})`,
          }}
        />
      )}

      {/* Callout text */}
      {(phase === 'callout' || phase === 'glow' || phase === 'settle') && (
        <div
          className={`sink-celebration__callout sink-celebration__callout--intensity-${Math.min(intensity, 5)}`}
          data-testid="sink-callout"
        >
          {calloutText}
        </div>
      )}

      {/* Particle burst */}
      {(phase === 'glow') && (
        <div className="sink-celebration__particles" data-testid="sink-particles">
          {particles.map((p) => (
            <span
              key={p.id}
              className="sink-celebration__particle"
              style={{
                '--angle': `${p.angle}deg`,
                '--distance': `${p.distance}px`,
                '--size': `${p.size}px`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
