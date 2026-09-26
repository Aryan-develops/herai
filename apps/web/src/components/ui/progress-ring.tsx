import { cn } from "@/lib/utils";

/** Circular progress. `value` is 0..1. Children render centred inside the ring. */
export function ProgressRing({
  value,
  label,
  size = 96,
  onDark = false,
  className,
  children,
}: {
  value: number;
  label: string;
  size?: number;
  onDark?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className={cn("relative shrink-0", className)} style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" stroke={onDark ? "rgba(255,255,255,0.25)" : "currentColor"} className={onDark ? undefined : "text-neutral-200"} strokeWidth="7" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          stroke={onDark ? "#fff" : "currentColor"}
          className={onDark ? undefined : "text-brand-500"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      {children && <div className="tabular absolute inset-0 flex flex-col items-center justify-center leading-none">{children}</div>}
    </div>
  );
}
