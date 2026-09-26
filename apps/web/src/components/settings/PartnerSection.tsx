import { Badge } from "@/components/ui/badge";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Clock, Copy, Eye, HeartHandshake, Link2, PauseCircle, PlayCircle, Send, Share2, Trash2, UserPlus } from "lucide-react";
import {
  api,
  ApiError,
  type InviteCreated,
  type InviteDirection,
  type OpenInvite,
  type PartnerLink,
  type Relationship,
  type SharedScopes,
} from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { TagInput } from "@/components/ui/tag-input";
import { SettingsCard, ToggleRow } from "@/components/settings/SettingsCard";

const RELATIONSHIPS: { id: Relationship; label: string }[] = [
  { id: "partner", label: "Partner" },
  { id: "family", label: "Family" },
  { id: "friend", label: "Friend" },
];

const SCOPE_ROWS: { key: keyof SharedScopes; label: string; hint: string }[] = [
  { key: "phase", label: "Cycle phase", hint: "Which phase you're in and the day count. Turning this off hides everything." },
  { key: "predictions", label: "Predictions and calendar", hint: "Estimated next period and the 14-day outlook." },
  { key: "mood", label: "Mood and what you need", hint: "Your latest check-in and one-tap signals like \"I need space\"." },
  { key: "comfort", label: "Comfort list", hint: "Snacks and things that help you feel better." },
  { key: "symptoms", label: "Symptom names (last 2 days)", hint: "Names only, never notes or severity. Off by default." },
  { key: "fertility", label: "Fertile window", hint: "Sensitive. Off by default." },
];

function niceDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function InviteBox({ created, onDone }: { created: InviteCreated; onDone: () => void }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(kind: "code" | "link") {
    try {
      await navigator.clipboard.writeText(kind === "code" ? created.code : created.link);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard blocked: the value is visible on screen to copy by hand.
    }
  }

  async function share() {
    const text = `Join me on Lunee. Use code ${created.code} or open this link:`;
    try {
      await navigator.share({ title: "Lunee invite", text, url: created.link });
    } catch {
      // Cancelled or unsupported: nothing to do.
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 animate-fade-up">
      <p className="text-sm font-medium text-ink-900">Invite ready. It works once and expires in 7 days.</p>
      <p aria-label={`Invite code ${created.code}`} className="tabular mt-3 text-center font-display text-3xl font-semibold tracking-widest text-brand-700">
        {created.code}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <Button size="sm" variant="outline" onClick={() => copy("code")}>
          {copied === "code" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
          {copied === "code" ? "Copied" : "Copy code"}
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy("link")}>
          {copied === "link" ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          {copied === "link" ? "Copied" : "Copy link"}
        </Button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <Button size="sm" onClick={share}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </Button>
        )}
      </div>
      <p className="mt-3 text-center text-xs text-ink-700/60">{created.emailSent ? "We also emailed it to them." : "Send it to them yourself, the way you normally would."}</p>
      <div className="mt-2 text-center">
        <Button size="sm" variant="ghost" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

function PartnerCard({ p, onChanged }: { p: PartnerLink; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<{ action: string; at: string }[] | null>(null);
  const [nickname, setNickname] = useState(p.nickname ?? "");

  async function patch(data: Parameters<typeof api.updatePartnerLink>[1]) {
    setBusy(true);
    setError(null);
    try {
      await api.updatePartnerLink(p.id, data);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save that.");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Stop sharing with ${p.firstName}? They'll lose access straight away.`)) return;
    try {
      await api.revokePartnerLink(p.id);
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't remove them.");
    }
  }

  async function showLog() {
    setLog((await api.partnerAccessLog(p.id).catch(() => ({ entries: [] }))).entries);
  }

  const paused = p.status === "paused";

  return (
    <li className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-violet-100 font-display font-semibold text-brand-700">
          {p.firstName[0]}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-ink-900">{p.nickname || p.firstName}</p>
          <p className="text-xs text-ink-700/60">
            {RELATIONSHIPS.find((r) => r.id === p.relationship)?.label} · since {niceDate(p.createdAt)}
          </p>
        </div>
        <Badge tone={paused ? "amber" : "sage"}>
          {paused ? "Paused" : "Sharing"}
        </Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          <Eye className="h-4 w-4" aria-hidden="true" />
          What they see
        </Button>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => patch({ status: paused ? "active" : "paused" })}>
          {paused ? <PlayCircle className="h-4 w-4" aria-hidden="true" /> : <PauseCircle className="h-4 w-4" aria-hidden="true" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <Button size="sm" variant="ghost" onClick={remove}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Remove
        </Button>
      </div>
      {paused && <p className="mt-2 text-xs text-ink-700/60">While paused they see "Nothing to show right now". They aren't told you paused.</p>}
      {error && <Alert tone="error" className="mt-3">{error}</Alert>}

      {open && (
        <div className="mt-4 border-t border-neutral-200 pt-3">
          <div className="flex items-end gap-2 pb-2">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor={`nick-${p.id}`}>What they're called (only you see this)</Label>
              <Input id={`nick-${p.id}`} value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={40} placeholder={p.firstName} />
            </div>
            <Button size="sm" variant="outline" disabled={busy || nickname === (p.nickname ?? "")} onClick={() => patch({ nickname: nickname.trim() || null })}>
              Save
            </Button>
          </div>
          <div className="divide-y divide-neutral-200">
            {SCOPE_ROWS.map((row) => (
              <ToggleRow
                key={row.key}
                label={row.label}
                hint={row.hint}
                checked={p.scopes[row.key]}
                disabled={busy}
                onChange={(next) => patch({ scopes: { [row.key]: next } })}
              />
            ))}
          </div>
          <p className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs text-ink-700/70">
            They never see your notes, health conditions, medications, reports or exact logs.
          </p>
          <div className="mt-3">
            {log === null ? (
              <Button size="sm" variant="ghost" onClick={showLog}>
                <Clock className="h-4 w-4" aria-hidden="true" />
                When did they look?
              </Button>
            ) : log.length === 0 ? (
              <p className="text-xs text-ink-700/60">They haven't opened your summary yet.</p>
            ) : (
              <ul className="space-y-1 text-xs text-ink-700/70">
                {log.slice(0, 8).map((e, i) => (
                  <li key={i}>Viewed your summary · {new Date(e.at).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

export function PartnerSection() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerLink[] | null>(null);
  const [invites, setInvites] = useState<OpenInvite[]>([]);
  const [created, setCreated] = useState<InviteCreated | null>(null);
  const [relationship, setRelationship] = useState<Relationship>("partner");
  const [email, setEmail] = useState("");
  const [direction, setDirection] = useState<InviteDirection>("woman_invites_partner");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<{ inviterFirstName: string; direction: InviteDirection } | null>(null);
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const [comfort, setComfort] = useState<string[]>([]);
  const [comfortSaved, setComfortSaved] = useState(false);

  const load = useCallback(() => {
    api.listMyPartners().then(({ partners }) => setPartners(partners)).catch(() => setPartners([]));
    api.listInvites().then(({ invites }) => setInvites(invites)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
    api.getComfort().then(({ items }) => setComfort(items)).catch(() => {});
  }, [load]);

  async function createInvite() {
    setBusy(true);
    setError(null);
    try {
      setCreated(await api.createInvite({ direction, relationship, email: email.trim() || undefined }));
      setEmail("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function checkCode() {
    setJoinBusy(true);
    setJoinMessage(null);
    setPreview(null);
    try {
      setPreview(await api.previewInvite({ code: code.trim() }));
    } catch (err) {
      setJoinMessage({ tone: "error", text: err instanceof ApiError ? err.message : "That code isn't valid." });
    } finally {
      setJoinBusy(false);
    }
  }

  async function accept() {
    setJoinBusy(true);
    try {
      const { role } = await api.acceptInvite({ code: code.trim() });
      setJoinMessage({ tone: "success", text: role === "partner" ? "You're connected. Open Partner home to see how she's doing." : "You're connected. They'll see only what you choose to share." });
      setCode("");
      setPreview(null);
      load();
    } catch (err) {
      setJoinMessage({ tone: "error", text: err instanceof ApiError ? err.message : "Couldn't connect." });
    } finally {
      setJoinBusy(false);
    }
  }

  async function saveComfort(items: string[]) {
    setComfort(items);
    setComfortSaved(false);
    try {
      await api.putComfort(items);
      setComfortSaved(true);
    } catch {
      // Keep the local edit; the next change retries.
    }
  }

  return (
    <SettingsCard
      id="partner"
      icon={HeartHandshake}
      title="Partner and support circle"
      description="Let someone you trust support you better. You decide exactly what they see, and you can stop at any time."
    >
      <div className="space-y-8">
        <div>
          <h3 className="text-sm font-semibold text-ink-900">People you share with</h3>
          {partners === null && <div className="skeleton mt-3 h-20" aria-hidden="true" />}
          {partners?.length === 0 && <p className="mt-2 text-sm text-ink-700/70">You're not sharing with anyone yet.</p>}
          <ul className="mt-3 space-y-3">{partners?.map((p) => <PartnerCard key={p.id} p={p} onChanged={load} />)}</ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-900">Invite someone</h3>
          <div className="mt-3 flex gap-2" role="radiogroup" aria-label="Who is invited">
            {(
              [
                ["woman_invites_partner", "I share my cycle with them"],
                ["partner_requests_woman", "I want to follow someone"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={direction === id}
                onClick={() => {
                  setDirection(id);
                  setCreated(null);
                }}
                className={`min-h-11 flex-1 cursor-pointer rounded-xl border px-3 text-sm font-medium transition-colors ${
                  direction === id ? "border-brand-400 bg-brand-50 text-brand-700" : "border-neutral-200 bg-white text-ink-700 hover:border-brand-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {direction === "partner_requests_woman" && (
            <p className="mt-2 text-xs text-ink-700/60">She has to accept before you can see anything.</p>
          )}
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-rel">They are my</Label>
              <Select id="invite-rel" value={relationship} onChange={(e) => setRelationship(e.target.value as Relationship)}>
                {RELATIONSHIPS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email them (optional)</Label>
              <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" autoComplete="off" />
            </div>
          </div>
          {error && <Alert tone="error" className="mt-3">{error}</Alert>}
          <Button className="mt-3" onClick={createInvite} disabled={busy}>
            {busy ? <Spinner /> : email.trim() ? <Send className="h-4 w-4" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            {email.trim() ? "Create and email invite" : "Create invite"}
          </Button>
          <p className="mt-2 text-xs text-ink-700/60">People need to be 18 or over and have a Lunee account.</p>

          {created && <div className="mt-4"><InviteBox created={created} onDone={() => setCreated(null)} /></div>}

          {invites.length > 0 && (
            <ul className="mt-4 space-y-2">
              {invites.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 px-3 py-2 text-sm">
                  <span className="text-ink-700">
                    Open invite · expires {niceDate(i.expiresAt)}
                    <span className="text-ink-700/60"> ({i.direction === "woman_invites_partner" ? "you share" : "you follow"})</span>
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      await api.cancelInvite(i.id).catch(() => {});
                      load();
                    }}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-900">Got a code or link from someone?</h3>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setPreview(null);
                setJoinMessage(null);
              }}
              placeholder="ABCD-EFGH"
              aria-label="Invite code"
              autoCapitalize="characters"
              autoComplete="off"
              className="tabular tracking-widest uppercase"
            />
            <Button variant="outline" onClick={checkCode} disabled={joinBusy || code.trim().length < 6}>
              {joinBusy && !preview ? <Spinner /> : null}
              Check code
            </Button>
          </div>
          {preview && (
            <div className="mt-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 animate-fade-up">
              <p className="text-sm text-ink-900">
                {preview.direction === "woman_invites_partner"
                  ? `${preview.inviterFirstName} invited you to follow her cycle so you can support her. She controls what you see.`
                  : `${preview.inviterFirstName} would like to follow your cycle updates. Accepting lets them see only what you choose to share.`}
              </p>
              <Button className="mt-3" size="sm" onClick={accept} disabled={joinBusy}>
                {joinBusy && <Spinner />}
                Accept and connect
              </Button>
            </div>
          )}
          {joinMessage && <Alert tone={joinMessage.tone} className="mt-3">{joinMessage.text}</Alert>}
          {user?.isPartner && (
            <Link to="/partner" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline">
              Open Partner home
            </Link>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-ink-900">Your comfort list</h3>
          <p className="mt-1 text-xs text-ink-700/60">Snacks, drinks and things that help. Shown to partners you allow, so they know what to bring.</p>
          <div className="mt-3">
            <TagInput values={comfort} onChange={saveComfort} placeholder="Type and press Enter, e.g. dark chocolate" />
          </div>
          {comfortSaved && <p className="mt-1.5 text-xs text-sage-700">Saved</p>}
        </div>
      </div>
    </SettingsCard>
  );
}
