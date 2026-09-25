/**
 * First-party crash reporting for the web app. Sends only an error message, stack and current route to the
 * gateway (`/api/client-errors`); never request bodies or anything the person typed.
 */
const sent = new Set<string>();

function report(message: string, stack: string | undefined, fatal: boolean) {
  try {
    const key = `${message}|${(stack ?? "").slice(0, 120)}`;
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);
    fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "web", message: message.slice(0, 500), stack: stack?.slice(0, 4000), route: location.pathname, fatal }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Reporting must never make a crash worse.
  }
}

export function initErrorReporting() {
  window.addEventListener("error", (e) => report(e.message || "Unknown error", e.error?.stack, true));
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    report(reason instanceof Error ? reason.message : String(reason), reason instanceof Error ? reason.stack : undefined, false);
  });
}
