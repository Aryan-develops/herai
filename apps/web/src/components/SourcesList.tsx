import { useState } from "react";
import { BookOpen, ChevronDown, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SourceRef {
  title: string;
  source: string;
  url: string | null;
  topic: string;
}

export function SourcesList({ sources }: { sources: SourceRef[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-semibold text-ink-700/70"
      >
        <span className="flex items-center gap-1.5">
          <BookOpen className="h-3.5 w-3.5" />
          Sources ({sources.length})
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <ul className="space-y-1.5 border-t border-neutral-200 px-3 py-2">
          {sources.map((s, i) => (
            <li key={i} className="text-xs">
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                >
                  {s.title}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="font-medium text-ink-900">{s.title}</span>
              )}
              <span className="ml-1.5 text-ink-700/50">
                —{" "}
                {s.source === "synthetic-demo" ? (
                  <span className="italic">Demo knowledge base</span>
                ) : (
                  s.source
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
