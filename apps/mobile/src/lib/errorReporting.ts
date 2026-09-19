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

let initialized = false;

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
}
