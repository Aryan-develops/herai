/**
 * Crash/error reporting, behind one function — same swappable-provider shape
 * as apps/ai-service/app/llm/base.py. No Sentry DSN exists yet, so this
 * reports to the console (visible in `npx expo start` logs and in EAS's own
 * crash logs) rather than pretending to ship to a vendor with no credentials.
 *
 * To wire up Sentry later: `npx expo install @sentry/react-native`, call
 * `Sentry.init()` in `report()`'s body, and forward native crashes through
 * it too — nothing calling `reportError` needs to change.
 */

import { API_URL } from "../config";

let initialized = false;
const sent = new Set<string>();

export function initErrorReporting(): void {
  if (initialized) return;
  initialized = true;

  const previousHandler = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(error, { isFatal, source: "global" });
    previousHandler(error, isFatal);
  });

  const previousRejectionHandler = (globalThis as any).onunhandledrejection;
  (globalThis as any).onunhandledrejection = (event: PromiseRejectionEvent) => {
    reportError(event.reason instanceof Error ? event.reason : new Error(String(event.reason)), {
      source: "unhandledRejection",
    });
    previousRejectionHandler?.(event);
  };
}

export function reportError(error: Error, context?: Record<string, unknown>): void {
  // Health data must never end up in a crash report — only the error and a
  // caller-supplied context (screen name, HTTP status), never request bodies
  // or user-entered text. Callers are responsible for keeping context clean.
  console.error("[herai:error]", error.message, context ?? {}, error.stack);

  // First-party reporting to the gateway (no vendor account needed). Fire and forget, once per distinct
  // error per session, and never allowed to throw from inside an error handler.
  try {
    const key = `${error.message}|${(error.stack ?? "").slice(0, 120)}`;
    if (sent.has(key) || sent.size > 20) return;
    sent.add(key);
    fetch(`${API_URL}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "mobile",
        message: error.message.slice(0, 500),
        stack: error.stack?.slice(0, 4000),
        route: typeof context?.path === "string" ? context.path : undefined,
        status: typeof context?.status === "number" ? context.status : undefined,
        fatal: context?.isFatal === true,
      }),
    }).catch(() => {});
  } catch {
    // Reporting must never make a crash worse.
  }
}
