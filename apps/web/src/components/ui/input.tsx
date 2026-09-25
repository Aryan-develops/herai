import { type InputHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, icon, ...props }, ref) => {
  if (icon) {
    return (
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-neutral-200 bg-white pr-3 pl-10 text-sm text-ink-900 shadow-soft transition-shadow placeholder:text-neutral-400 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none disabled:opacity-50",
            className
          )}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-ink-900 shadow-soft transition-shadow placeholder:text-neutral-400 focus-visible:border-brand-400 focus-visible:ring-4 focus-visible:ring-brand-200 focus-visible:outline-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";
