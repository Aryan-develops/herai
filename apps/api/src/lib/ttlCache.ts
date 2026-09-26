/** Tiny per-instance cache with a fixed time to live. Only ever holds successful lookups. */
export class TtlCache<V> {
  private items = new Map<string, { value: V; expires: number }>();
  constructor(
    private ttlMs: number,
    private max = 500,
  ) {}

  get(key: string): V | undefined {
    const hit = this.items.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.items.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: string, value: V) {
    if (this.items.size >= this.max) this.items.delete(this.items.keys().next().value as string);
    this.items.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}
