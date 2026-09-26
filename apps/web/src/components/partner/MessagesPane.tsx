import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, Send } from "lucide-react";
import { api, ApiError, type PartnerMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Thread {
  linkId: string;
  name: string;
}

/** Private text thread between the two people on a link. Polls every 15 seconds while visible. */
export function MessagesPane({ threads }: { threads: Thread[] }) {
  const [active, setActive] = useState<string | null>(threads[0]?.linkId ?? null);
  const [messages, setMessages] = useState<PartnerMessage[] | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !threads.some((t) => t.linkId === active)) setActive(threads[0]?.linkId ?? null);
  }, [threads, active]);

  const load = useCallback(() => {
    if (!active || document.visibilityState !== "visible") return;
    api.listMessages(active).then(({ messages }) => setMessages(messages)).catch(() => {});
  }, [active]);

  useEffect(() => {
    setMessages(null);
    load();
    const t = setInterval(load, 15_000);
    document.addEventListener("visibilitychange", load);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", load);
    };
  }, [load]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || !active) return;
    setSending(true);
    setError(null);
    try {
      const { message } = await api.sendMessage(active, body);
      setMessages((m) => [...(m ?? []), message]);
      setText("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  }

  if (threads.length === 0) return null;

  return (
    <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-5" aria-labelledby="msg-h">
      <h2 id="msg-h" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
        <MessageCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
        Messages
      </h2>

      {threads.length > 1 && (
        <div role="tablist" aria-label="Conversations" className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {threads.map((t) => (
            <button
              key={t.linkId}
              type="button"
              role="tab"
              aria-selected={t.linkId === active}
              onClick={() => setActive(t.linkId)}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer rounded-full border px-3.5 text-sm font-medium",
                t.linkId === active ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 text-ink-700",
              )}
            >
              {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-3 max-h-80 min-h-32 space-y-2 overflow-y-auto rounded-2xl bg-neutral-50 p-3" aria-live="polite">
        {messages === null && <div className="skeleton h-10 w-2/3 rounded-2xl" aria-hidden="true" />}
        {messages?.length === 0 && <p className="py-6 text-center text-sm text-neutral-500">No messages yet. Say hi.</p>}
        {messages?.map((m) => (
          <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-line",
                m.mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-neutral-200 bg-white text-ink-900",
              )}
            >
              {m.body}
              <span className={cn("mt-0.5 block text-[10px]", m.mine ? "text-white/70" : "text-neutral-400")}>
                {new Date(m.createdAt).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="mt-3 flex items-end gap-2">
        <label htmlFor="msg-input" className="sr-only">
          Message
        </label>
        <textarea
          id="msg-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as FormEvent);
            }
          }}
          maxLength={1000}
          rows={1}
          placeholder="Write a message…"
          className="min-h-11 flex-1 resize-none rounded-2xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200"
        />
        <Button type="submit" disabled={sending || !text.trim()} aria-label="Send message" className="h-11 w-11 rounded-2xl px-0">
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}
    </section>
  );
}
