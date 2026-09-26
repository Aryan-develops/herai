// Dev-only end-to-end check of Partner Mode + settings against a locally running API.
// Usage: node scripts/partner-e2e.mjs
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });

const API = process.env.API_URL ?? "http://localhost:4000/api";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  " + extra : ""}`);
  if (!ok) failures++;
};

async function call(token, method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
}

async function signUp(email, name, dob = "1995-05-05", guardianEmail) {
  const res = await fetch(API + "/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password: "testpass123", dateOfBirth: dob, guardianEmail }),
  });
  const j = await res.json();
  await admin.from("profiles").update({ onboarding_complete: true }).eq("id", j.user.id);
  return { id: j.user.id, token: j.session.accessToken, email };
}

const stamp = Date.now();
const she = await signUp(`she${stamp}@herai.test`, "Priya Sharma");
const he = await signUp(`he${stamp}@herai.test`, "Rohan Mehta");
const other = await signUp(`oth${stamp}@herai.test`, "Kabir Other");
const created = [she.id, he.id, other.id];

try {
  // Give her a cycle so guidance has a phase, plus private data that must never reach him.
  const lastStart = new Date(Date.now() - 23 * 86400000).toISOString();
  await admin.from("health_profiles").upsert({ user_id: she.id, cycle_length_days: 28, last_period_start: lastStart.slice(0, 10), known_conditions: ["SECRET-CONDITION"], medications: ["SECRET-MED"] });
  await admin.from("symptom_logs").insert({ user_id: she.id, symptoms: [{ name: "Headache", severity: 2 }], notes: "SECRET-NOTE" });

  // ---- invites
  const inv = await call(she.token, "POST", "/partner/invites", { direction: "woman_invites_partner", relationship: "partner" });
  check("woman creates invite (code + link)", inv.status === 201 && /^[A-Z2-9]{4}-[A-Z2-9]{4}$/.test(inv.json.code) && inv.json.link.includes("/join/"));

  const selfAccept = await call(she.token, "POST", "/partner/invites/accept", { code: inv.json.code });
  check("cannot accept own invite (generic error)", selfAccept.status === 404);

  const bad = await call(he.token, "POST", "/partner/invites/accept", { code: "ZZZZ-ZZZZ" });
  check("wrong code gives generic 404", bad.status === 404 && /valid|expired/.test(bad.json.error));

  const preview = await call(he.token, "GET", `/partner/invites/preview?token=${inv.json.link.split("/join/")[1]}`);
  check("preview shows inviter first name only", preview.status === 200 && preview.json.inviterFirstName === "Priya");

  const accept = await call(he.token, "POST", "/partner/invites/accept", { code: inv.json.code.toLowerCase() });
  check("partner accepts by code (case-insensitive)", accept.status === 201 && accept.json.role === "partner");
  const linkId = accept.json.linkId;

  const reuse = await call(other.token, "POST", "/partner/invites/accept", { code: inv.json.code });
  check("invite is single use", reuse.status === 404);

  const dup = await call(she.token, "POST", "/partner/invites", { direction: "woman_invites_partner" });
  const dupAccept = await call(he.token, "POST", "/partner/invites/accept", { code: dup.json.code });
  check("already-connected returns 409", dupAccept.status === 409);

  // ---- summary is derived only
  const sum = await call(he.token, "GET", `/partner/women/${linkId}/summary?lang=en`);
  const raw = JSON.stringify(sum.json);
  check("partner summary available with phase + guidance", sum.status === 200 && sum.json.available && sum.json.phase.key && sum.json.guidance.do.length >= 2);
  check("summary never leaks notes, conditions or medications", !raw.includes("SECRET") && !raw.includes("Headache"));
  check("symptoms are off by default", sum.json.symptoms === null);
  check("summary carries estimated flag + disclaimer", typeof sum.json.phase.estimated === "boolean" && sum.json.guidance.disclaimer.length > 10);

  const hi = await call(he.token, "GET", `/partner/women/${linkId}/summary?lang=hi`);
  check("Hindi guidance is served", /[ऀ-ॿ]/.test(hi.json.guidance.title));

  const stranger = await call(other.token, "GET", `/partner/women/${linkId}/summary`);
  check("a third person cannot read the link", stranger.status === 404);

  const herView = await call(she.token, "GET", `/partner/women/${linkId}/summary`);
  check("she cannot use the partner endpoint on her own link", herView.status === 404);

  // ---- moods + needs + scopes
  const mood = await call(she.token, "POST", "/logs/moods", { mood: "irritable", energy: 2, need: "space" });
  check("mood log saved", mood.status === 201);
  const sum2 = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("partner sees mood + need tip", sum2.json.mood?.mood === "irritable" && sum2.json.guidance.need?.title);

  const scope = await call(she.token, "PATCH", `/partner/links/${linkId}`, { scopes: { mood: false, symptoms: true, fertility: true } });
  check("she updates scopes", scope.status === 200 && scope.json.partner.scopes.mood === false);
  const sum3 = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("mood hidden after she turns it off", sum3.json.mood === null);
  check("opt-in symptoms show names only", Array.isArray(sum3.json.symptoms) && sum3.json.symptoms.includes("Headache") && !JSON.stringify(sum3.json).includes("SECRET-NOTE"));
  check("opt-in fertility window shown", !!sum3.json.fertility?.window);

  const partnerPatch = await call(he.token, "PATCH", `/partner/links/${linkId}`, { scopes: { mood: true } });
  check("partner cannot change what is shared", partnerPatch.status === 403);

  // ---- daily insights + back-dated entries
  check("partner summary includes insight cards", Array.isArray(sum.json.insights) && sum.json.insights.length >= 4 && sum.json.insights.every((c) => c.title && c.body));
  const mine = await call(she.token, "GET", "/logs/insights/daily");
  check("she gets her own insight cards", mine.status === 200 && mine.json.cards.length >= 4 && !!mine.json.phase);
  const hiCards = await call(she.token, "GET", "/logs/insights/daily?lang=hi");
  check("insights available in Hindi", /[ऀ-ॿ]/.test(hiCards.json.cards[0].title));
  const past = new Date(Date.now() - 3 * 86400000).toISOString();
  const backMood = await call(she.token, "POST", "/logs/moods", { mood: "low", energy: 4, loggedAt: past });
  check("mood can be logged for an earlier date", backMood.status === 201 && backMood.json.mood.loggedAt.slice(0, 10) === past.slice(0, 10));
  const backSym = await call(she.token, "POST", "/logs/symptoms", { symptoms: [{ name: "Headache", severity: 2 }], loggedAt: past });
  check("symptom can be logged for an earlier date", backSym.status === 201);
  const dateOnlyProfile = await call(she.token, "PUT", "/profile", { lastPeriodStart: "2026-09-01" });
  check("profile accepts a date-only last period start", dateOnlyProfile.status === 200);

  // ---- her changes show up for him straight away (no stale copy)
  await call(she.token, "PATCH", `/partner/links/${linkId}`, { scopes: { mood: true, comfort: true } });
  await call(she.token, "PUT", "/settings/comfort", { items: ["Fresh item"] });
  const fresh = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("comfort list edit is visible to him immediately", fresh.json.comfort?.includes("Fresh item"));
  await call(she.token, "POST", "/logs/moods", { mood: "anxious", need: "hug" });
  const listNow = await call(he.token, "GET", "/partner/women");
  const card = listNow.json.women.find((w) => w.linkId === linkId);
  check("partner list card shows her newest mood", card?.mood === "anxious");
  const fresh2 = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("summary shows the newest mood and need", fresh2.json.mood?.mood === "anxious" && fresh2.json.mood?.need === "hug" && fresh2.json.insights[0]?.id === "mood");
  await call(she.token, "PATCH", `/partner/links/${linkId}`, { status: "paused" });
  const listPaused = await call(he.token, "GET", "/partner/women");
  check("pause is reflected in his list", listPaused.json.women.find((w) => w.linkId === linkId)?.available === false);
  await call(she.token, "PATCH", `/partner/links/${linkId}`, { status: "active" });

  // ---- tasks, streak, feedback, events
  const t1 = await call(he.token, "POST", `/partner/women/${linkId}/tasks`, { taskId: sum.json.guidance.tasks[0].id, done: true });
  check("task done updates streak", t1.status === 200 && t1.json.streak >= 1 && t1.json.doneToday.length === 1);
  const fb = await call(he.token, "POST", `/partner/women/${linkId}/feedback`, { guidanceKey: sum.json.guidance.key, helpful: true });
  check("feedback recorded", fb.status === 201);
  const evDate = sum.json.calendar.find((d) => d.phase === "menstrual" || d.phase === "pms")?.date ?? sum.json.calendar[3].date;
  const ev = await call(he.token, "POST", `/partner/women/${linkId}/events`, { title: "Anniversary dinner", date: evDate });
  check("event added", ev.status === 201);
  const sum4 = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("plan overlay lists event", sum4.json.events.some((e) => e.title === "Anniversary dinner"));

  // ---- audit + pause + revoke
  const log = await call(she.token, "GET", `/partner/links/${linkId}/access-log`);
  check("she can see the access log", log.status === 200 && log.json.entries.length >= 1);

  const pause = await call(she.token, "PATCH", `/partner/links/${linkId}`, { status: "paused" });
  const paused = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("paused link shows a neutral 'nothing to show'", pause.status === 200 && paused.json.available === false && !/pause/i.test(paused.json.message));

  await call(she.token, "PATCH", `/partner/links/${linkId}`, { status: "active" });
  const revoke = await call(she.token, "DELETE", `/partner/links/${linkId}`);
  const gone = await call(he.token, "GET", `/partner/women/${linkId}/summary`);
  check("revoke is immediate", revoke.status === 204 && gone.status === 404);

  // ---- partner-initiated direction: she must approve
  const pInv = await call(he.token, "POST", "/partner/invites", { direction: "partner_requests_woman" });
  const pAcceptByHim = await call(other.token, "POST", "/partner/invites/accept", { code: pInv.json.code });
  check("partner-initiated invite accepted by a third person makes them the woman (they hold the data)", pAcceptByHim.status === 201 && pAcceptByHim.json.role === "woman");
  const pAccept = await call(she.token, "POST", "/partner/invites/accept", { code: (await call(he.token, "POST", "/partner/invites", { direction: "partner_requests_woman" })).json.code });
  check("she can re-connect by accepting his request", pAccept.status === 201 && pAccept.json.role === "woman");

  // ---- many-to-many
  const women = await call(he.token, "GET", "/partner/women");
  check("partner follows more than one woman", women.status === 200 && women.json.women.length >= 2);
  const trial = women.json.subscription;
  check("14-day trial started at first link", trial.state === "trialing" && trial.daysLeft >= 13 && trial.hasAccess && trial.paywallOn === false);

  // ---- minors cannot use partner features
  const minor = await signUp(`min${stamp}@herai.test`, "Young Person", new Date(Date.now() - 15 * 365.25 * 86400000).toISOString().slice(0, 10), `guardian${stamp}@herai.test`).catch(() => null);
  if (minor) {
    created.push(minor.id);
    const blocked = await call(minor.token, "POST", "/partner/invites", {});
    check("minors cannot invite", blocked.status === 403);
  }

  // ---- throttle
  let limited = false;
  for (let i = 0; i < 12; i++) {
    const r = await call(other.token, "POST", "/partner/invites/accept", { code: `BAD${i}-XXXX` });
    if (r.status === 429) limited = true;
  }
  check("brute-force throttle kicks in", limited);

  // ---- payments (UI-only)
  const plans = await call(he.token, "GET", "/payments/plans");
  check("plans list price, methods and unconnected providers", plans.status === 200 && plans.json.plan.priceInr === 100 && plans.json.methods.length >= 5 && plans.json.providers.every((p) => p.connected === false));
  const co = await call(he.token, "POST", "/payments/checkout", { method: "upi_id", vpa: "rohan@okhdfc" });
  check("checkout reports not_connected (no charge)", co.status === 200 && co.json.status === "not_connected");
  const badVpa = await call(he.token, "POST", "/payments/checkout", { method: "upi_id", vpa: "nope" });
  check("invalid UPI ID rejected", badVpa.status === 400);
  const gift = await call(he.token, "POST", "/payments/gift/create", { months: 3 });
  check("gift code created (free in testing)", gift.status === 201 && /^GIFT-/.test(gift.json.code));
  const selfRedeem = await call(he.token, "POST", "/payments/gift/redeem", { code: gift.json.code });
  check("cannot redeem own gift", selfRedeem.status === 400);
  const redeem = await call(other.token, "POST", "/payments/gift/redeem", { code: gift.json.code });
  check("someone else redeems gift and gets access", redeem.status === 200 && redeem.json.subscription.state === "active");
  const again = await call(she.token, "POST", "/payments/gift/redeem", { code: gift.json.code });
  check("gift is single use", again.status === 404);

  // ---- settings
  const comfort = await call(she.token, "PUT", "/settings/comfort", { items: ["Dark chocolate", "Heating pad"] });
  check("comfort list saved", comfort.status === 200 && comfort.json.items.length === 2);
  const prefs = await call(he.token, "PUT", "/settings/prefs", { language: "hi", partnerDailyNudge: false });
  check("prefs saved", prefs.status === 200 && prefs.json.prefs.language === "hi");
  const sec = await call(she.token, "GET", "/settings/security");
  check("security shows sign-in methods", sec.status === 200 && sec.json.hasPassword === true);
  const wrongPw = await call(she.token, "POST", "/settings/password", { currentPassword: "nope-nope", newPassword: "another-pass-1" });
  check("wrong current password is refused", wrongPw.status === 401);
  const okPw = await call(she.token, "POST", "/settings/password", { currentPassword: "testpass123", newPassword: "another-pass-1" });
  check("password changed and a fresh session is returned", okPw.status === 200 && !!okPw.json.session?.accessToken);
  she.token = okPw.json.session.accessToken;
  const exp = await call(she.token, "GET", "/settings/export");
  check("data export includes her logs", exp.status === 200 && exp.json.moodLogs.length >= 1 && exp.json.symptomLogs.length >= 1);
  const ins = await call(she.token, "GET", "/logs/moods/insights");
  check("mood insights need more data first", ins.status === 200 && ins.json.ready === false);
  const cyc = await call(she.token, "GET", "/logs/cycles/insights");
  check("cycle insights include sub-phase + confidence", cyc.status === 200 && "subPhase" in cyc.json.insights && !!cyc.json.insights.confidence);

  // ---- durations
  const dMood = await call(she.token, "POST", "/logs/moods", { mood: "low", durationMinutes: 90 });
  check("mood stores duration", dMood.status === 201 && dMood.json.mood.durationMinutes === 90);
  const dSym = await call(she.token, "POST", "/logs/symptoms", { symptoms: [{ name: "Cramps", severity: 3 }], durationMinutes: 180 });
  check("symptom stores duration", dSym.status === 201 && dSym.json.log?.duration_minutes === 180);
  const dBad = await call(she.token, "POST", "/logs/symptoms", { symptoms: [{ name: "Cramps", severity: 3 }], durationMinutes: 0 });
  check("invalid duration rejected", dBad.status === 400);
  const tl = await call(she.token, "GET", "/logs/timeline");
  check("timeline includes mood events", tl.status === 200 && JSON.stringify(tl.json).includes('"mood"'));

  // ---- period range + one flow per day
  const d0 = new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10);
  const d1 = new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10);
  const rng = await call(she.token, "POST", "/logs/cycles/range", { days: [{ date: d0, flow: "heavy" }, { date: d1, flow: "light" }] });
  check("period range saves every day", rng.status === 201 && rng.json.logs.length === 2);
  await call(she.token, "POST", "/logs/cycles/range", { days: [{ date: d0, flow: "medium" }] });
  const cl = await call(she.token, "GET", "/logs/cycles");
  const onD0 = cl.json.logs.filter((l) => l.loggedAt?.slice(0, 10) === d0 || l.logged_at?.slice(0, 10) === d0);
  check("one flow per day (replaced)", onD0.length === 1 && onD0[0].flow === "medium");
  const fut = await call(she.token, "POST", "/logs/cycles/range", { days: [{ date: "2999-01-01", flow: "light" }] });
  check("future period days rejected", fut.status === 400);

  // ---- cascade
  const linkBefore = await admin.from("partner_links").select("id").eq("partner_id", he.id);
  await admin.auth.admin.deleteUser(he.id);
  const linkAfter = await admin.from("partner_links").select("id").eq("partner_id", he.id);
  created.splice(created.indexOf(he.id), 1);
  check("deleting an account removes its partner links", (linkBefore.data?.length ?? 0) > 0 && (linkAfter.data?.length ?? 0) === 0);
} finally {
  for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {});
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}
