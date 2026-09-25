import type { ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: AlertCircle, role: "alert" as const },
  success: { box: "border-sage-100 bg-sage-50 text-sage-700", icon: CheckCircle2, role: "status" as const },
  info: { box: "border-violet-100 bg-violet-50 text-violet-700", icon: Info, role: "status" as const },
  warning: { box: "border-amber-100 bg-amber-50 text-amber-700", icon: ShieldAlert, role: "status" as const },
};

/** Icon + text, never colour alone; errors announce themselves to screen readers. */
export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
  className?: string;
}) {
  const t = TONES[tone];
  const Icon = t.icon;
  return (
    <div role={t.role} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm", t.box, className)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
