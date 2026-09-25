# Store & compliance blockers

Open items that will fail app review or create legal exposure if shipped as-is.
Written while drafting `PRIVACY.md` / `TERMS.md` against the real schema.

Nothing here is legal advice — these are engineering observations that need a lawyer's
sign-off.

---

## 1. Minors (under 18) — consent mechanism BUILT, verification strength OPEN

The product supports under-18 users, so DPDP Act 2023 applies: a child's data may not
be processed without **verifiable** parental consent.

**What is implemented**

- Registration requires a date of birth. Under 18 requires a guardian's email.
- A minor's account is created in `consent_status = 'pending'`. It stays there until a
  guardian acts.
- `requireConsent` middleware gates **every** health-data route (profile, logs,
  reports, agent executions). A pending minor gets `403 PARENTAL_CONSENT_REQUIRED`;
  only `/auth/me` stays reachable, so the app can show a waiting screen.
- The guardian receives a one-time link (32 random bytes; only the SHA-256 hash is
  stored) valid for 14 days, and can grant, decline, or later withdraw.
- Withdrawal flips the account back to blocked immediately.
- `parental_consents` records guardian email, method, timestamp, IP and user-agent as
  the audit trail, and has RLS enabled with **no policies** so a minor can never read
  or self-approve their own consent record.

**What is still open — read before launch**

1. **"Verifiable" is a legal standard, and email is the weakest form of it.** Clicking
   a link proves control of an inbox, not that the person is an adult or the child's
   guardian. India's draft DPDP Rules point toward stronger verification (for example
   DigiLocker-backed identity or a virtual token). A lawyer must confirm whether
   email-link consent is sufficient for your launch, and if not, the verification step
   is the only part that has to change — the rest of the flow already carries it.
2. **No email is actually sent yet.** `config/notifier.ts` logs the link in
   development and throws in production, deliberately: silently failing to deliver
   would strand a minor in `pending` forever. Wire up a transactional email provider
   before serving real minors.
3. **The AI service is unauthenticated** (see §7) — consent is enforced at the API
   gateway, which is what persists data, but the pipeline itself is not behind it.
4. **Google Play Families policy** still applies to an app available to minors, as do
   stricter Apple age-rating rules. Neither is a code change, but both must be
   completed at submission.
5. `health_profiles.age_range` still offers `13-17`. That is now consistent with
   supporting minors — but if the decision is ever reversed to 18+, that CHECK
   constraint, the onboarding UI and the Zod schema all need updating together.

## 2. Account deletion — RESOLVED

Both stores require an in-app path to delete the account and its data (Google Play
account-deletion policy; Apple guideline 5.1.1(v)).

Implemented as `DELETE /api/auth/account` (`authController.deleteAccount`): clears the
user's files from the `reports` bucket, then deletes the auth user, which cascades every
table. Exposed in the web client as `api.deleteAccount()`.

**Still to do:** surface it in the UI — a settings screen with an explicit confirmation
step. The endpoint alone does not satisfy the store requirement; a user must be able to
reach it without contacting support. Needed in the mobile app too (Phase 4).

## 3. Data-safety declarations — RESOLVED (draft)

Mapped from the real schema in `docs/STORE-DATA-SAFETY.md` — the full Apple App
Privacy and Google Play Data Safety breakdown, table by table, not from memory.

**Still to do:** re-derive that document if the schema changes before submission, and
confirm the "collected vs. shared" classification for the LLM processor against
whatever the stores' guidance says at submission time (their definitions shift).

## 4. Medical-disclaimer placement — RESOLVED for in-app; store listing still open

The disclaimer exists in the pipeline output (`orchestrator.DISCLAIMER`) and reaches
chat/report results in both web and mobile. It is now also shown verbatim during
mobile onboarding (`OnboardingScreen.tsx`) behind a required acknowledgment checkbox
that gates the Finish button — the user cannot complete onboarding without seeing and
confirming it. The web onboarding flow does not yet have the equivalent checkbox.

**Still to do:**
- Add the same acknowledgment step to the web onboarding flow (`apps/web`).
- Include the disclaimer in store listing copy (App Store / Play Store description) —
  a code change cannot satisfy this, it has to be written into the submission itself.

## 5. Emergency handling is advisory only

The Safety/Triage agent raises an emergency banner. `TERMS.md` §1 states plainly that
HERAI cannot reliably detect emergencies and must not be relied on. Keep it that way —
any copy implying dependable emergency detection materially raises both regulatory risk
(medical-device classification) and real-world harm risk.

The backlog item "one-tap emergency-helpline call button" is worth doing, but it must
not be framed as HERAI summoning help.

## 6. LLM vendor terms

`PRIVACY.md` §4 asserts the AI provider does not train on API data. Verify against the
commercial terms in force at publication, for whichever provider is configured
(`LLM_PROVIDER`), and re-check when those terms change. Note that Gemini's **free
tier** and its paid tier have different data-use terms — the free tier is generally
not suitable for real user health data.

## 7. The AI service has no authentication — OPEN

`apps/ai-service` (FastAPI) exposes the chat and document pipelines with no auth. The
web app calls it directly through the Vite proxy, passing the health profile in the
request body.

Consequences:
- Parental consent is enforced at the Express gateway, not here. A pending minor is
  blocked from storing anything, but the pipeline itself would still answer a direct
  request.
- If this service is ever exposed publicly, anyone can run the pipeline at your
  vendor's cost.

Before production: require the same bearer token the gateway does, or keep the service
on a private network reachable only from the gateway.

## 8. App icon and splash screen are still Expo's generic placeholder — OPEN

`apps/mobile/app.json` now points splash/background colors at the brand palette
(`#fdf2f8`), but `assets/icon.png` and the Android adaptive-icon layers are still the
default Expo scaffold graphics. Both stores reject generic/placeholder icons at
review. This needs real icon artwork (1024×1024 master, plus Android adaptive-icon
foreground/background/monochrome layers) from a designer or design tool — not
something to fake with a placeholder before submission.

## 9. Crash reporting is console-only — OPEN

`apps/mobile/src/lib/errorReporting.ts` catches render errors (via a top-level
`ErrorBoundary`), global JS errors, and unhandled promise rejections, and reports 5xx
API failures — but only to the console today, since no crash-reporting vendor (Sentry
or similar) is configured. This is real error *handling* (the app no longer
white-screens on a render crash), but not yet real error *reporting* — nothing reaches
you once the app is in someone else's hands. Wire up a vendor before relying on this
for production visibility; the call site (`reportError`) will not need to change.

## 10. Care referrals share health data with third parties — OPEN

Patients can send a lab or doctor a request and choose to share their health profile and
specific reports. That is a new kind of disclosure the privacy documents don't cover yet.

**Built in:** nothing is shared by default; the consent step lists exactly what will be sent;
consent time is recorded (`care_requests.consent_at`); cancelling or a provider declining
withdraws access immediately (`/provider/requests/:id/shared` returns 403); providers see
only a patient's first name and only what was shared; only the caller's own reports can be
shared; requests are gated by the same DOB and parental-consent checks as other health data.

**Still to do before real users:**
- Update `PRIVACY.md` and `STORE-DATA-SAFETY.md`: providers are a new recipient; "shared"
  now includes user-directed disclosure to a named third party.
- Verify credentials before approving anyone (`scripts/approve-provider.mjs` does not check).
  Sample listings (`is_sample`) are hidden unless `SHOW_SAMPLE_PROVIDERS=true` — never set
  that in production.
- Providers become data recipients of medical information: a data-processing agreement,
  and a deletion/retention rule for what they viewed, need a lawyer.
- Referral fees or any payment between a provider and HERAI must be disclosed to patients.
- The helpline numbers in the Get help sheet are India-only and hand-entered; confirm them.
- Reviews are limited to completed visits, but there is no moderation yet.
