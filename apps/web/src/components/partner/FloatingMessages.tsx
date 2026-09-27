import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { MessagesPane, type Thread } from "@/components/partner/MessagesPane";
import { cn } from "@/lib/utils";

/** Same messaging feature as before, just reached from a floating bubble on the Partner page instead of sitting inline on the page. */
export function FloatingMessages({ threads }: { threads: Thread[] }) {
  const [open, setOpen] = useState(false);
  if (threads.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close messages" : "Messages"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 bottom-44 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-brand-500 text-white shadow-lift transition-transform active:scale-95 lg:right-6 lg:bottom-[6.5rem]",
          !open && "animate-[pulse_3s_ease-in-out_infinite]",
        )}
      >
        {open ? <X className="h-6 w-6" aria-hidden="true" /> : <MessageCircle className="h-6 w-6" aria-hidden="true" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Messages"
          className="fixed right-4 bottom-[15rem] z-40 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-3xl shadow-lift lg:right-6 lg:bottom-[10.5rem]"
        >
          <MessagesPane threads={threads} />
        </div>
      )}
    </>
  );
}
