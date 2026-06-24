import { useEffect, useState, useRef } from 'react';
import type { CelebrationEvent } from '../celebrationSystem';

interface CelebrateProps {
  event: CelebrationEvent | null;
  muted: boolean;
  /** Override all animation durations (0 in tests) */
  animationMs?: number;
}

type Phase = 'idle' | 'burst' | 'callout' | 'glow' | 'settle';

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
}

function generateParticles(count: number, intensity: number): Particle[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    angle: (360 / count) * i + Math.random() * 20 - 10,
    distance: 40 + intensity * 60 + Math.random() * 30,
    size: 3 + intensity * 2 + Math.random() * 2,
  }));
}

function playCelebrationSound(freq: number, duration: number, coolToned: boolean): void {
  if (freq === 0) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = coolToned ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      coolToned ? freq * 0.7 : freq * 1.5,
      ctx.currentTime + duration / 1000 * 0.3,
    );

    const volume = coolToned ? 0.08 : 0.15;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000);
    osc.onended = () => ctx.close();
  } catch {
    // Audio unavailable
  }
}

/**
 * ONE shared celebration component. All tiers route through here.
 * Orchestrates: particles → glow-pulse → callout → sound → settle.
 * Honors prefers-reduced-motion + mute centrally.
 */
export function Celebrate({ event, muted, animationMs }: CelebrateProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [particles, setParticles] = useState<Particle[]>([]);
  const prevEventRef = useRef<CelebrationEvent | null>(null);
  const reducedMotion = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!event || event === prevEventRef.current) return;
    prevEventRef.current = event;

    const { context } = event;
    const duration = animationMs ?? 400;

    // Reduced-motion: deliver info instantly, no staged motion
    if (reducedMotion.current) {
      setPhase('callout');
      setParticles([]);
      const t = setTimeout(() => setPhase('idle'), Math.max(duration * 3, 1200));
      return () => clearTimeout(t);
    }

    setParticles(generateParticles(context.particleCount, context.intensity));

    // Sound (gated by mute — handled centrally here for ALL tiers)
    if (!muted && context.soundFreq > 0) {
      playCelebrationSound(context.soundFreq, context.soundDuration, context.coolToned);
    }

    // Phase sequence: burst → callout → glow → settle → idle
    setPhase('burst');
    const t1 = setTimeout(() => setPhase('callout'), duration);
    const t2 = setTimeout(() => setPhase('glow'), duration * 2);
    const settle = animationMs !== undefined ? animationMs : context.settleDuration;
    const t3 = setTimeout(() => setPhase('settle'), duration * 2 + settle);
    const t4 = setTimeout(() => setPhase('idle'), duration * 2 + settle + duration);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [event, muted, animationMs]);

  if (phase === 'idle' || !event) return null;

  const { tier, context } = event;
  const isCool = context.coolToned;

  return (
    <div
      className={`celebrate celebrate--${tier} celebrate--${phase} ${isCool ? 'celebrate--cool' : ''}`}
      data-testid="celebrate"
      data-tier={tier}
      data-phase={phase}
      aria-live="assertive"
      role="alert"
    >
      {/* Screen-edge glow */}
      {(phase === 'glow' || phase === 'settle' || phase === 'burst') && (
        <div
          className="celebrate__glow"
          data-testid="celebrate-glow"
          style={{
            boxShadow: `inset 0 0 ${context.glowRadius}px ${context.glowRadius / 3}px ${context.glowColor}`,
          }}
        />
      )}

      {/* Callout text */}
      {(phase === 'callout' || phase === 'glow' || phase === 'settle') && (
        <div
          className={`celebrate__callout celebrate__callout--${tier}`}
          data-testid="celebrate-callout"
        >
          {context.calloutText}
        </div>
      )}

      {/* Particle burst */}
      {phase === 'glow' && particles.length > 0 && (
        <div className="celebrate__particles" data-testid="celebrate-particles">
          {particles.map((p) => (
            <span
              key={p.id}
              className="celebrate__particle"
              style={{
                '--angle': `${p.angle}deg`,
                '--distance': `${p.distance}px`,
                '--size': `${p.size}px`,
                '--particle-color': context.particleColor,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}
