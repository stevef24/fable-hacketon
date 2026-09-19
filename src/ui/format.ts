// OWNER: P5 (vivi09032000). Shared formatting helpers for the UI.

/** Milliseconds → `M:SS.mmm` with fixed-width fields so nothing jitters. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.round(ms));
  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  const millis = total % 1000;
  return `${minutes}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}
