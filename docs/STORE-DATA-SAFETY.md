# Store data-safety declarations

**Status: DRAFT, mapped from the actual schema — not from memory. Re-verify against
current Apple/Google form wording at submission time; both forms change.**

This exists because Apple's App Privacy "nutrition label" and Google Play's Data
Safety form are common rejection reasons, and worse for a health app specifically:
mis-declaring health data is treated as a serious violation, not a minor one. Every
row below maps to a real column, in a real table, in the live Supabase schema
(`supabase/` migrations referenced in `docs/COMPLIANCE-NOTES.md`) — not a guess at
what the app "probably" collects.

## Data inventory (source of truth)

| Data category | Table / source | Columns |
|---|---|---|
| Email address | `auth.users` (Supabase Auth) | email |
| Name, date of birth | `public.profiles` | name, date_of_birth |
| Password | `auth.users` (Supabase Auth, hashed) | — never touches app code |
| Health profile | `public.health_profiles` | age_range, height_cm, weight_kg, cycle_length_days, last_period_start, known_conditions, medications, allergies, smoker, alcohol, exercise_frequency, sleep_hours_avg |
| Symptom logs | `public.symptom_logs` | symptoms (name + severity), notes, logged_at |
| Cycle logs | `public.cycle_logs` | flow, symptoms, notes, logged_at |
| Uploaded lab reports (files) | Supabase Storage, `reports` bucket | the PDF/JPG/PNG itself |
| Uploaded lab reports (extracted data) | `public.health_reports` | extracted_values, document_intelligence, womens_health, risk_assessment, care_plan, sources, emergency, confidence |
| Chat messages | sent to `apps/ai-service`, not persisted server-side beyond the `agent_executions` summary below | message text, in-memory for the duration of one pipeline run |
| Agent run metadata | `public.agent_executions` | trigger_type, agent names + durations, emergency flag, risk_level — **not** message content (see `LOG_HEALTH_DATA` in `docs/COMPLIANCE-NOTES.md`) |
| Parental consent records (only if account is a minor) | `public.parental_consents` | guardian email/name, status, timestamps, IP, user-agent |
| Mood check-ins | `public.mood_logs` | mood, energy, need, logged_at |
| Comfort list | `public.comfort_lists` | items |
| Notification preferences and push tokens | `public.notification_prefs`, `public.push_tokens` | flags, language, device token |
| Partner invites and links | `public.partner_invites` (hashed codes only), `public.partner_links`, `public.partner_access_log` | who, relationship, status, per-item sharing choices, view times |
| Follower activity | `public.partner_task_progress`, `public.partner_events`, `public.partner_feedback` | completed suggestion ids, plan titles/dates, helpful yes/no |
| Subscription | `public.partner_subscriptions`, `public.gift_codes`, `public.payment_mandates` | status, dates, hashed gift codes. No card/bank/UPI details are stored |
| Care requests | `public.care_requests` | what was asked, chosen time, ids of shared reports, consent time |
| Crash/error reports | client-side (`apps/mobile/src/lib/errorReporting.ts`) | error message + stack trace, HTTP status + request path only — never request bodies |

## Apple App Privacy ("nutrition label")

Declare under **Health & Fitness**:
- Health (symptom/cycle logs, health profile, lab report values) — linked to identity
  (tied to the account), used for App Functionality, not used for tracking.

Declare under **Contact Info**:
- Name, Email Address — linked to identity, used for App Functionality (account/auth).

Declare under **User Content**:
- Photos or Videos (a lab report image, if uploaded as a photo rather than a PDF) —
  linked to identity, used for App Functionality.

Declare under **Diagnostics**:
- Crash Data, Performance Data — from `errorReporting.ts`. Currently console-only, not
  sent to a third party; if Sentry (or similar) is wired in later, this section must
  be updated to name that processor.

Declare under **Identifiers**:
- Device ID (the push notification token), only if the person turns on phone notifications,
  linked to identity, used for App Functionality.

Declare under **Location** (only if the shipped build asks for it):
- Location is read on the device to sort nearby labs and doctors. It is sent to our server
  as coordinates for that search and not stored. Declare it if it leaves the device, as it
  does today.

Declare under **Purchases / Financial Info** *once payments are switched on*:
- Purchase history (subscription status). Card, bank and UPI details stay with the payment
  provider; still name the provider.

**Data NOT collected** (explicitly answer "No" / omit):
- Browsing History, Search History, Contacts, Advertising Data. None of these are
  collected anywhere in the schema above.

**"Used to track you"**: No. Nothing here is shared with a data broker or used to
correlate the user across other companies' apps/websites.

## Google Play Data Safety form

**Data collected and shared:**

| Data type | Collected | Shared | Purpose | Required or optional |
|---|---|---|---|---|
| Name | Yes | No | Account management | Required |
| Email address | Yes | No | Account management | Required |
| Health info (symptoms, cycle data, lab values, conditions/medications) | Yes | Yes — see below | App functionality | Required for core features |
| Photos (if a report is uploaded as an image) | Yes | Yes — see below | App functionality | Optional |
| Crash logs | Yes | No (console-only today) | Analytics | Optional |

**User-directed sharing (declare as "Shared")**: a person can choose to share a derived summary
of their cycle with partners/family/friends, and their profile and chosen reports with a lab
or doctor. This is disclosure to another user or a named third party at the user's request, so
list "Health info" as shared, purpose "App functionality", and describe it as user-controlled
and revocable.

**"Shared" here means sent to a processor for the app's own functionality**, which
Google's definitions generally distinguish from sharing with a third party for their
own purposes — confirm this classification against Play's current guidance at
submission time, since misclassifying "processing" as "no sharing" (or vice versa)
is exactly the kind of error that gets an app rejected:

- **Anthropic / Google Gemini** (whichever `LLM_PROVIDER` is active) receives the
  message text or extracted report values needed to generate a response.
- **Resend** (email) receives an address and message text for emails the user asked for.
- **Expo push service** receives a device token and notification text.
- **Supabase** stores everything in the inventory table above, encrypted at rest,
  hosted in `ap-south-1`.
- Local, on-device knowledge-base search (`app/llm/embeddings.py`) sends nothing
  anywhere — it runs on the server, not a third party, and needs no declaration as
  "sharing."

**Security practices to declare:**
- Data is encrypted in transit (HTTPS/TLS) — Yes.
- Data is encrypted at rest — Yes (Supabase-managed).
- Users can request data deletion — Yes: in-app account deletion
  (`DELETE /api/auth/account`, see `docs/COMPLIANCE-NOTES.md` §2) erases everything
  in the inventory table immediately, including storage files.
- Independent security review — No, unless one has actually been done; do not
  declare this without a real audit.

**Data safety section — children:**
Answer honestly based on the current parental-consent implementation (see
`docs/COMPLIANCE-NOTES.md` §1). Because the app knowingly serves under-18 users with
a verifiable-consent flow, review Play's Families policy requirements — this may
require additional declarations beyond the Data Safety form itself.

## Before submitting

1. Re-derive this table from the schema again if any migration has landed since this
   was written — do not submit from memory.
2. Confirm which LLM provider is actually configured in production
   (`LLM_PROVIDER`) and name it explicitly in both forms; "an AI provider" is not
   an acceptable answer to either store.
3. If Sentry or any analytics SDK is added, update the Diagnostics/Crash Data
   sections on both forms before the next submission — silently adding a new data
   processor without updating these forms is itself a policy violation.
