/**
 * Delay in milliseconds before the AI shot resolves.
 * Set to 0 in tests for synchronous/deterministic behavior.
 */
export let AIM_MS = 800;

export function setAimMs(ms: number): void {
  AIM_MS = ms;
}
