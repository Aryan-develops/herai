import { Link } from "react-router-dom";
import { HeartHandshake, Users } from "lucide-react";
import type { PartnerLink, WomanCard } from "@/lib/api";
import { PARTNER_PHASE_STYLE } from "@/lib/phases";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const REL: Record<string, string> = { partner: "Partner", family: "Family", friend: "Friend" };

/**
 * Both sides of the circle on one card: the people supporting you and the people you follow.
 * Fed by the same polling refresh as the rest of the page, so a pause, revoke or new link shows up on both
 * people's screens within a minute.
 */
export function CircleCard({
  supporters,
  following,
  selected,
  onSelect,
}: {
  supporters: PartnerLink[] | null;
  following: WomanCard[] | null;
  selected: string | null;
  onSelect: (linkId: string) => void;
}) {
  const live = (supporters ?? []).filter((s) => s.status !== "revoked");
  if (!live.length && !(following?.length)) return null;

  return (
    <section className="mt-5 rounded-3xl border border-neutral-200 bg-white p-4 shadow-soft sm:p-5" aria-labelledby="circle-h">
      <div className="flex items-center justify-between gap-2">
        <h2 id="circle-h" className="flex items-center gap-2 font-display text-lg font-semibold text-ink-900">
          <Users className="h-4 w-4 text-brand-600" aria-hidden="true" />
          Your circle
        </h2>
        <Link to="/settings#partner" className="text-sm font-medium text-brand-700 hover:underline">
          Manage
        </Link>
      </div>

      {live.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">Supporting you</p>
          <ul className="mt-2 space-y-2">
            {live.map((s) => {
              const shared = Object.values(s.scopes).filter(Boolean).length;
              return (
                <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-neutral-100 p-2.5">
                  <Avatar name={s.nickname ?? s.firstName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{s.nickname ?? s.firstName}</p>
                    <p className="text-xs text-neutral-500">
                      {REL[s.relationship] ?? s.relationship} · sees {shared} of {Object.keys(s.scopes).length} things
                    </p>
                  </div>
                  <Badge tone={s.status === "active" ? "sage" : "amber"}>{s.status === "active" ? "Active" : "Paused"}</Badge>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {!!following?.length && (
        <div className="mt-4">
          <p className="text-xs font-semibold tracking-wide text-neutral-500 uppercase">You're following</p>
          <ul className="mt-2 space-y-2">
            {following.map((w) => {
              const style = w.phaseKey ? PARTNER_PHASE_STYLE[w.phaseKey] : null;
              const active = w.linkId === selected;
              return (
                <li key={w.linkId}>
                  <button
                    type="button"
                    onClick={() => onSelect(w.linkId)}
                    aria-pressed={active}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2.5 text-left transition-colors",
                      active ? "border-brand-300 bg-brand-50" : "border-neutral-100 hover:border-brand-200",
                    )}
                  >
                    <Avatar name={w.firstName} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink-900">{w.firstName}</p>
                      <p className="text-xs text-neutral-500">{REL[w.relationship] ?? w.relationship}</p>
                    </div>
                    {w.available && w.cycleDay ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-ink-700">
                        <span className={cn("h-2.5 w-2.5 rounded-full", style?.dot ?? "bg-neutral-300")} aria-hidden="true" />
                        Day {w.cycleDay}
                      </span>
                    ) : (
                      <Badge tone="neutral">{w.available ? "Synced" : "Not sharing now"}</Badge>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="mt-3 flex items-center gap-1.5 text-xs text-neutral-500">
        <HeartHandshake className="h-3.5 w-3.5" aria-hidden="true" />
        Updates on both sides within a minute. Whoever shares can pause or stop any time.
      </p>
    </section>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-violet-500 text-sm font-semibold text-white" aria-hidden="true">
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}
