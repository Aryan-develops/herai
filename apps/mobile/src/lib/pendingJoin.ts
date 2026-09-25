import * as Linking from "expo-linking";

/**
 * Invite links (herai://join/<token> or https://…/join/<token>) can arrive before sign-in. The token is held in
 * memory until the signed-in navigator is ready to show the Join screen.
 */
let pending: string | null = null;
const listeners = new Set<() => void>();

function tokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  const match = /\/join\/([A-Za-z0-9_-]{16,128})/.exec(url);
  return match ? match[1] : null;
}

function accept(url: string | null) {
  const token = tokenFromUrl(url);
  if (token) {
    pending = token;
    listeners.forEach((l) => l());
  }
}

/** Call once at startup. */
export function initJoinLinks() {
  Linking.getInitialURL().then(accept).catch(() => {});
  Linking.addEventListener("url", (e) => accept(e.url));
}

export function takePendingJoin(): string | null {
  const t = pending;
  pending = null;
  return t;
}

export function onPendingJoin(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
