import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2, Maximize2, MessageCircleHeart, Send, ShieldAlert, Sparkles, X } from "lucide-react";
import { useChatSession } from "@/lib/useChatSession";
import { loadChatLanguage } from "@/lib/chatLanguages";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  "How am I doing this cycle?",
  "I've had a headache on and off for a few days",
  "Explain my last lab report",
  "I want to talk about how I'm feeling",
];

/** Compact streaming chat that floats over every screen, so help is always one tap away without leaving the page. */
export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const language = loadChatLanguage();
  const { turns, busy, send, loadContext } = useChatSession(language);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, open]);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    send(input);
    setInput("");
  }

  function quick(prompt: string) {
    send(prompt);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close chat" : "Ask Lunee"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 bottom-24 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-white shadow-lift transition-transform active:scale-95 lg:right-6 lg:bottom-6",
          !open && "animate-[pulse_3s_ease-in-out_infinite]",
        )}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircleHeart className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Ask Lunee"
          className="fixed right-4 bottom-[10.5rem] z-40 flex h-[min(32rem,70vh)] w-[min(23rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-lift lg:right-6 lg:bottom-24"
        >
          <div className="relative flex shrink-0 items-center gap-2.5 bg-gradient-to-br from-brand-500 via-brand-600 to-violet-600 px-4 py-3.5 text-white">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/20 ring-1 ring-white/40">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Ask Lunee</p>
              <p className="text-[11px] text-white/80">Usually replies in seconds</p>
            </div>
            <Link
              to="/chat"
              aria-label="Open full chat"
              title="Open full chat"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/85 hover:bg-white/15"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3.5">
            {turns.length === 0 && (
              <div>
                <p className="text-sm text-ink-700/80">Ask anything about your cycle, symptoms or reports — or try:</p>
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {QUICK_PROMPTS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => quick(p)}
                      className="rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs font-medium text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn) => {
              const text = turn.result?.reply ?? turn.result?.symptom_analysis?.summary;
              return (
                <div key={turn.id} className="space-y-2">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-brand-500 to-brand-600 px-3 py-2 text-sm text-white">
                      {turn.userMessage}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[90%] rounded-2xl rounded-tl-md border border-brand-100 bg-brand-50/60 px-3 py-2 text-sm text-ink-900">
                      {turn.emergency && (
                        <div role="alert" className="mb-1.5 flex items-start gap-1.5 text-red-700">
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                          <span className="text-xs font-medium">{turn.emergency.message}</span>
                        </div>
                      )}
                      {turn.status === "error" && <span className="text-xs text-red-700">{turn.error}</span>}
                      {text && <p className="whitespace-pre-line">{text}</p>}
                      {turn.status === "streaming" && !text && (
                        <span className="flex gap-1 py-0.5" aria-label="Lunee is typing">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-300 [animation-delay:-0.2s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-400 [animation-delay:-0.1s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
                        </span>
                      )}
                      {!!turn.result?.follow_up_questions?.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {turn.result.follow_up_questions.slice(0, 3).map((q, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => quick(q)}
                              className="rounded-full border border-brand-200 bg-white px-2 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"
                            >
                              {q}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={submit} className="flex shrink-0 items-center gap-2 border-t border-neutral-100 p-2.5">
            <label htmlFor="floating-chat-input" className="sr-only">
              Ask Lunee
            </label>
            <input
              id="floating-chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="h-10 min-w-0 flex-1 rounded-full border border-neutral-200 bg-neutral-50 px-3.5 text-sm outline-none focus-visible:border-brand-400 focus-visible:ring-2 focus-visible:ring-brand-200"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white disabled:opacity-40"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
