import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Small inline "pencil → text field" editor for the private nickname each side can give the other. */
export function NicknameEditor({
  value,
  placeholder,
  onSave,
  className,
}: {
  value: string | null;
  placeholder: string;
  onSave: (nickname: string | null) => Promise<void> | void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  if (editing) {
    return (
      <form
        className={cn("flex items-center gap-1", className)}
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave(draft.trim() || null);
            setEditing(false);
          } finally {
            setSaving(false);
          }
        }}
      >
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          maxLength={40}
          className="h-8 w-32 rounded-lg border border-brand-300 bg-white px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-brand-200"
        />
        <button type="submit" disabled={saving} aria-label="Save nickname" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sage-700 hover:bg-sage-50">
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? "");
            setEditing(false);
          }}
          aria-label="Cancel"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </form>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label="Edit nickname"
      title="Edit nickname"
      className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-brand-600", className)}
    >
      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
    </button>
  );
}
