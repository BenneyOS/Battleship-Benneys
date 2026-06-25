import type { LastShotEvent } from './headerStatus';
import type { FleetProgressData } from '../engine/selectors';

// ─── Celebration Tier Types ──────────────────────────────────────────────────

export type CelebrationTier = 'micro' | 'sink' | 'milestone' | 'phase-complete' | 'victory' | 'defeat';

export interface CelebrationEvent {
  tier: CelebrationTier;
  context: CelebrationContext;
}

export interface CelebrationContext {
  calloutText: string;
  /** 0-1 intensity scalar, derived from tier + rarity */
  intensity: number;
  /** Particle count (0 = none) */
  particleCount: number;
  /** Glow radius in px */
  glowRadius: number;
  /** Glow color (CSS) */
  glowColor: string;
  /** Particle color (CSS) */
  particleColor: string;
  /** Sound frequency base (Hz), 0 = no sound */
  soundFreq: number;
  /** Sound duration (ms) */
  soundDuration: number;
  /** Duration of settle phase (ms) before cleanup */
  settleDuration: number;
  /** Whether this is cool-toned (defeat/player-hit) */
  coolToned: boolean;
  /** Haptic vibration pattern (ms), empty = no haptic */
  hapticPattern: number[];
}

// ─── Tier → Context mapping ──────────────────────────────────────────────────

const TIER_CONFIG: Record<CelebrationTier, Omit<CelebrationContext, 'calloutText'>> = {
  micro: {
    intensity: 0.15,
    particleCount: 0,
    glowRadius: 15,
    glowColor: 'rgba(255, 109, 0, 0.3)',
    particleColor: '#ff6d00',
    soundFreq: 0,
    soundDuration: 0,
    settleDuration: 400,
    coolToned: false,
    hapticPattern: [10],
  },
  sink: {
    intensity: 0.5,
    particleCount: 10,
    glowRadius: 35,
    glowColor: 'rgba(194, 24, 91, 0.4)',
    particleColor: '#e91e63',
    soundFreq: 520,
    soundDuration: 350,
    settleDuration: 1200,
    coolToned: false,
    hapticPattern: [30, 20, 30],
  },
  milestone: {
    intensity: 0.35,
    particleCount: 6,
    glowRadius: 25,
    glowColor: 'rgba(0, 229, 255, 0.35)',
    particleColor: '#00e5ff',
    soundFreq: 480,
    soundDuration: 300,
    settleDuration: 1000,
    coolToned: false,
    hapticPattern: [20, 10, 20],
  },
  'phase-complete': {
    intensity: 0.45,
    particleCount: 12,
    glowRadius: 30,
    glowColor: 'rgba(0, 229, 255, 0.4)',
    particleColor: '#00e5ff',
    soundFreq: 600,
    soundDuration: 400,
    settleDuration: 1200,
    coolToned: false,
    hapticPattern: [30, 15, 30],
  },
  victory: {
    intensity: 1.0,
    particleCount: 30,
    glowRadius: 60,
    glowColor: 'rgba(255, 215, 64, 0.5)',
    particleColor: '#ffd740',
    soundFreq: 660,
    soundDuration: 600,
    settleDuration: 2000,
    coolToned: false,
    hapticPattern: [50, 30, 50, 30, 100],
  },
  defeat: {
    intensity: 0.3,
    particleCount: 0,
    glowRadius: 20,
    glowColor: 'rgba(100, 140, 180, 0.3)',
    particleColor: '#78909c',
    soundFreq: 220,
    soundDuration: 500,
    settleDuration: 1200,
    coolToned: true,
    hapticPattern: [40, 60, 40],
  },
};

export function buildCelebration(tier: CelebrationTier, calloutText: string): CelebrationEvent {
  const config = TIER_CONFIG[tier];
  return {
    tier,
    context: { ...config, calloutText },
  };
}

// ─── Derive celebration from game events ─────────────────────────────────────

export function deriveCelebrationFromShot(
  lastShot: LastShotEvent | null,
  enemyFleetProgress: FleetProgressData,
): CelebrationEvent | null {
  if (!lastShot) return null;

  // Player hits/sinks on enemy board
  if (lastShot.actor === 'human') {
    if (lastShot.outcome === 'sunk') {
      const shipName = lastShot.sunkShipName ?? 'Enemy ship';
      if (enemyFleetProgress.isDefeated) {
        return buildCelebration('victory', 'VICTORY');
      }
      // Scale sink intensity by how many ships have been sunk
      const base = TIER_CONFIG.sink;
      const sunkCount = enemyFleetProgress.sunk;
      const scaledIntensity = Math.min(base.intensity + sunkCount * 0.1, 0.9);
      const scaledParticles = base.particleCount + sunkCount * 3;
      return {
        tier: 'sink',
        context: {
          ...base,
          calloutText: `${shipName.toUpperCase()} DOWN!`,
          intensity: scaledIntensity,
          particleCount: scaledParticles,
        },
      };
    }
    if (lastShot.outcome === 'hit') {
      return buildCelebration('micro', 'HIT');
    }
  }

  return null;
}

// ─── Milestone derivation ────────────────────────────────────────────────────

export interface MilestoneConfig {
  sunkCount: number;
  total: number;
  text: string;
}

/** Milestone triggers keyed to reachable ship counts (not arbitrary %). */
export function deriveMilestone(
  sunkCount: number,
  total: number,
  alreadyFired: ReadonlySet<number>,
): MilestoneConfig | null {
  if (total !== 5) return null;
  if (sunkCount === 3 && !alreadyFired.has(3)) {
    return { sunkCount: 3, total, text: 'Over halfway — 3 of 5 ships down!' };
  }
  if (sunkCount === 4 && !alreadyFired.has(4)) {
    return { sunkCount: 4, total, text: 'One to go — 4 of 5 ships sunk!' };
  }
  return null;
}

export function buildMilestoneCelebration(milestone: MilestoneConfig): CelebrationEvent {
  return buildCelebration('milestone', milestone.text);
}
