/**
 * Small in-memory sliding-window limiter. On serverless each instance keeps its own window, so this is a
 * brake on casual brute-forcing, not a hard guarantee; codes are also single-use and time-limited.
 */
const windows = new Map<string, number[]>();

export function hitRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    windows.set(key, recent);
    return true;
  }
  recent.push(now);
  windows.set(key, recent);
  if (windows.size > 5000) {
    for (const [k, v] of windows) if (v.every((t) => now - t >= windowMs)) windows.delete(k);
  }
  return false;
}
