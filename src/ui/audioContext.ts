// ─── Shared AudioContext (singleton, unlocked on first user gesture) ─────────
// Browsers block AudioContext playback until a user gesture (click/tap) resumes
// the context. This module creates ONE shared context and exposes unlockAudio()
// for wiring to the first interaction.

let sharedAudioCtx: AudioContext | null = null;
let audioUnlocked = false;

export function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContext();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

/**
 * Call on any user gesture (click/tap) to resume a suspended AudioContext.
 * Browsers require a user interaction before audio can play.
 */
export function unlockAudio(): void {
  if (audioUnlocked) return;
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  audioUnlocked = true;
}

/** Reset audio state (for tests / new game). */
export function resetAudioContext(): void {
  if (sharedAudioCtx) {
    try { sharedAudioCtx.close(); } catch { /* noop */ }
  }
  sharedAudioCtx = null;
  audioUnlocked = false;
}

export function playCelebrationSound(freq: number, duration: number, coolToned: boolean): void {
  if (freq === 0) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  // If context is suspended (no user gesture yet), try to resume
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

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
