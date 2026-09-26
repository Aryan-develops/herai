import { cn } from "@/lib/utils";

/** Friendly "nothing here yet" block with an optional icon and call to action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  body?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-brand-200 bg-white/70 p-8 text-center sm:p-10", className)}>
      {icon && (
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-100 text-brand-600" aria-hidden="true">
          {icon}
        </span>
      )}
      <p className="mt-4 font-display text-lg font-semibold text-ink-900">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-sm text-ink-700/70">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
