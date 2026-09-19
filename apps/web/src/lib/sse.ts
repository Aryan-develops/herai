/** Thrown when the stream goes silent for longer than the idle timeout —
 * distinct from a normal network/HTTP error so the UI can show a specific
 * "the AI service stopped responding" message instead of a generic one. */
export class StreamTimeoutError extends Error {
  constructor(message = "The AI service stopped responding. Please try again.") {
    super(message);
    this.name = "StreamTimeoutError";
  }
}

/**
 * Reads a `data: <json>\n\n` SSE stream from `fetch`, calling `onEvent` for
 * each parsed chunk. Guards against a request that hangs with no error and
 * no further output: the idle timer resets on every chunk received (not a
 * flat overall deadline — a legitimately slow multi-stage pipeline that's
 * still making progress isn't killed), and fires `StreamTimeoutError` only
 * when the stream goes silent for `idleTimeoutMs`.
 */
export async function streamSSE(
  input: RequestInfo,
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
    const res = await fetch(input, { ...init, signal: controller.signal });

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
