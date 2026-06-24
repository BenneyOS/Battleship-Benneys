// ─── Shared AudioContext (singleton, unlocked on first user gesture) ─────────
// Browsers block AudioContext playback until a user gesture (click/tap) resumes
// the context. This module creates ONE shared context and exposes unlockAudio()
// for wiring to user interactions.

let sharedAudioCtx: AudioContext | null = null;

function getOrCreateContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
      sharedAudioCtx = new AudioContext();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Call on EVERY user gesture (click/tap/keydown) to keep the AudioContext alive.
 * Browsers may suspend the context after a period of silence; calling resume()
 * on each gesture ensures it stays in 'running' state.
 */
export function unlockAudio(): void {
  const ctx = getOrCreateContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
}

/** Reset audio state (for tests). */
export function resetAudioContext(): void {
  if (sharedAudioCtx) {
    try { sharedAudioCtx.close(); } catch { /* noop */ }
  }
  sharedAudioCtx = null;
}

export function playCelebrationSound(freq: number, duration: number, coolToned: boolean): void {
  if (freq === 0) return;
  const ctx = getOrCreateContext();
  if (!ctx) return;

  // If context is suspended, resume it and schedule sound after resume completes
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      playOscillator(ctx, freq, duration, coolToned);
    }).catch(() => {});
    return;
  }

  playOscillator(ctx, freq, duration, coolToned);
}

function playOscillator(ctx: AudioContext, freq: number, duration: number, coolToned: boolean): void {
  if (ctx.state !== 'running') return;
  try {
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
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  } catch {
    // Audio unavailable
  }
}
