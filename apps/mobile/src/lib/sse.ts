// React Native's global `fetch` buffers the entire response before resolving
// — it has no streaming `response.body`, so a plain fetch can't read SSE
// chunk-by-chunk here. `expo/fetch` is Expo's polyfill built specifically to
// expose a real ReadableStream body on native, which is what makes this
// otherwise-identical port of apps/web/src/lib/sse.ts possible at all.
import { fetch } from "expo/fetch";

export class StreamTimeoutError extends Error {
  constructor(message = "The AI service stopped responding. Please try again.") {
    super(message);
    this.name = "StreamTimeoutError";
  }
}

/** Ported from apps/web/src/lib/sse.ts — same idle-timeout-not-flat-deadline
 * logic, same `data: <json>\n\n` parsing; only the fetch import differs. */
export async function streamSSE(
  url: string,
  init: RequestInit,
  onEvent: (data: unknown) => void,
  options?: { signal?: AbortSignal; idleTimeoutMs?: number }
): Promise<void> {
  const idleTimeoutMs = options?.idleTimeoutMs ?? 45000;
  const controller = new AbortController();
  const externalSignal = options?.signal;
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let timedOut = false;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, idleTimeoutMs);
  }
  resetIdleTimer();

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });

    if (!res.ok || !res.body) {
      throw new Error(`AI service error (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      resetIdleTimer();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith("data:")) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;
        try {
          onEvent(JSON.parse(jsonStr));
        } catch {
          // Ignore a malformed/partial chunk rather than aborting the whole stream.
        }
      }
    }
  } catch (err) {
    if (timedOut) {
      throw new StreamTimeoutError();
    }
    throw err;
  } finally {
    if (idleTimer) clearTimeout(idleTimer);
  }
}
