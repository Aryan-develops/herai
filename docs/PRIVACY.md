# Lunee — Privacy Policy

**Status: DRAFT. Not legally reviewed.**

This is an engineering-accurate draft: every claim below was written from the actual
database schema and code, not from a template. It still must be reviewed by a lawyer
qualified in Indian data-protection law (DPDP Act 2023) — and in GDPR if you launch in
the EU/UK — before you publish it or submit to either app store.

Fill every `[BRACKETED]` value before publishing:

| Placeholder | What it is |
|---|---|
| `[LEGAL ENTITY]` | Registered company/individual operating Lunee |
| `[REGISTERED ADDRESS]` | Business address |
| `[CONTACT EMAIL]` | Privacy contact inbox |
| `[GRIEVANCE OFFICER NAME]` / `[GRIEVANCE EMAIL]` | Required named contact under the DPDP Act |
| `[EFFECTIVE DATE]` | Date this version goes live |
| `[WEBSITE URL]` | Where this policy is hosted (both stores require a public URL) |

---

**Effective date:** `[EFFECTIVE DATE]`
**Operated by:** `[LEGAL ENTITY]`, `[REGISTERED ADDRESS]`

Lunee is a women's health information and risk-awareness tool. It does **not** diagnose
conditions and is not a substitute for professional medical care.

This policy explains what we collect, why, who it is shared with, and how you control it.

## 1. What we collect

Everything below is data you enter yourself or that is produced by analysing what you
entered. We do not buy data about you, and we do not track you across other apps or
websites.

**Account**
- Email address and password. Passwords are hashed by our authentication provider; we
  never see or store your plaintext password.
- Your name, and optionally your date of birth.

**Health profile**
- Age range, height, weight.
- Typical cycle length and last period start date.
- Known conditions, medications, allergies.
- Lifestyle details: smoking, alcohol use, exercise frequency, average sleep hours.

**Logs you create**
- Symptom entries: symptom names, a severity rating, free-text notes, and the time logged.
- Cycle entries: flow level, associated symptoms, free-text notes, and the time logged.

**Lab reports you upload**
- The report file itself (PDF, JPG or PNG) and its filename, type and size.
- Values extracted from it (for example haemoglobin, thyroid markers), along with the
  reference range and whether each value fell outside it.
- The AI-generated explanation, risk assessment, care plan and suggested questions for
  your clinician, and the knowledge-base sources cited.

**Conversations**
- The messages you send to the in-app assistant, and the analysis produced in response.

**Mood check-ins and comfort list**
- Mood, energy level and an optional "I need..." signal (space, a hug, food, to talk, rest)
  when you choose to log them, and a short list of comfort items you write yourself.

**Sharing with people you choose (Partner mode)**
- Who you invited or accepted, the relationship you set (partner, family, friend), what you
  allow them to see, and when they viewed your summary.
- For someone who follows another person: the plans (title and date) they add, which of their
  daily suggestions they completed, and their feedback on suggestions.
- Subscription status, trial dates, and gift codes. Payment card, bank and UPI details are
  handled by the payment provider and never reach our servers. `[Payments are not switched on
  yet; update this line when a provider is connected.]`

**Care referrals**
- When you ask a lab or doctor for a test, appointment or call-back: your request, the time
  you chose, and, only if you tick them, your health profile and the specific reports you
  select.

**Notifications**
- Your notification and language preferences and, if you turn on phone notifications, a
  device token used to deliver them.

**Technical records**
- A record of each AI pipeline run: which analysis stages ran, how long each took, the
  resulting risk level, and whether an emergency flag was raised. This record does not
  contain your symptoms or message text.

We do not collect location data, contacts, advertising identifiers, or your device's
microphone or camera except when you actively choose a photo to upload.

This is health data. Under the DPDP Act and GDPR it is treated as sensitive, and we
handle it accordingly.

## 2. Why we use it

- To provide the analysis you asked for: interpreting your symptoms, cycle history and
  uploaded reports, and producing information and suggested questions for your clinician.
- To personalise that analysis using your health profile, so results reflect your own
  context rather than a generic answer.
- To show your history and trends over time.
- To detect language or lab values that may indicate an emergency, and surface an urgent
  warning to you.
- To keep the service secure and to diagnose faults.

We do **not** use your health data to train AI models, sell it, share it with advertisers,
insurers or employers, or build advertising profiles.

## 3. Legal basis and consent

We process your health data on the basis of your explicit consent, given when you create
an account and provide health information. You may withdraw consent at any time by
deleting your account (section 7), which erases the underlying data.

Withdrawing consent means we can no longer provide the analysis features, since they
operate entirely on the data you provide.

## 4. Who we share it with

We use a small number of processors. They act on our instructions and may not use your
data for their own purposes.

| Processor | What it receives | Why | Where |
|---|---|---|---|
| Supabase | Account details, health profile, logs, uploaded report files and analysis results | Database, authentication and file storage | `ap-south-1` (India) |
| Resend (email) | Your email address and the text of an email we send you (invites, guardian consent requests, daily support notes) | Delivers email you have asked for or that a person you invited needs | Provider infrastructure |
| Expo push service | A device token and the short notification text | Delivers phone notifications you turned on | Provider infrastructure |
| Anthropic | The text of your message or the text extracted from your uploaded report, plus relevant health-profile context | Generates the AI analysis | Anthropic's API infrastructure |

Two points worth stating plainly:

- **Search runs on our own servers.** When your query is matched against our health
  knowledge base, the matching is computed locally. Your query is not sent to a
  third-party service for that step.
- **Anthropic does not train on this data.** Anthropic's commercial terms state that API
  inputs and outputs are not used to train their models. `[CONFIRM THIS AGAINST YOUR
  CURRENT ANTHROPIC COMMERCIAL TERMS BEFORE PUBLISHING.]`

**People you choose to share with.** Sharing with a partner, family member, friend, lab or
doctor is your decision and only happens when you set it up:

- **Partners, family and friends** see a *derived summary* you control: your cycle phase and
  day, and, only if you allow each one, predictions, your latest mood check-in, your comfort
  list, symptom *names* from the last two days, and your fertile window. They never see your
  notes, health conditions, medications, reports or exact logs. You can pause or remove
  anyone instantly, and you can see when they viewed your summary. While paused, they are
  not told that you paused.
- **Labs and doctors** receive only the health profile and reports you tick when you send
  a request, and lose access when you cancel or they decline.
- The AI service that words partner tips is given only the phase, an optional mood label and
  a language, never your data.

Partner features are only for people aged 18 and over.

We will also disclose data where legally required — for example a valid court order.

## 5. Where it is stored

Primary storage is in India (`ap-south-1`). AI analysis requests are processed by
Anthropic, which may process them outside India. By using the AI features you consent to
that transfer.

## 6. How it is protected

- All traffic is encrypted in transit (HTTPS/TLS).
- Data is encrypted at rest by our hosting provider.
- Database access is enforced by row-level security: rules at the database itself
  restrict every row to the account that owns it, so one user's records cannot be
  returned to another even if application code were flawed.
- Uploaded report files are held in a private bucket. They are never publicly
  accessible; the app fetches them through short-lived signed links that expire after
  ten minutes.
- Our internal logs record counts and timings, not the content of your symptoms,
  messages or reports.

No system is perfectly secure, and we do not claim otherwise.

## 7. Your rights and choices

You can:

- **Access** your data — view it in the app at any time.
- **Correct** it — edit your health profile and logs directly.
- **Delete individual records** — remove any symptom log, cycle log, mood check-in or uploaded report.
- **Download your data** — Settings > Privacy and your data exports everything we hold about you as a file.
- **Control sharing** — Settings > Partner and support circle shows who sees what, when they looked, and lets you pause or stop sharing at once.
- **Delete your account** — permanently erases your account, health profile, all logs,
  all uploaded files, all analysis results and every sharing connection. This is immediate and cannot be undone.
- **Withdraw consent** — by deleting your account.
- **Complain** — contact our Grievance Officer below, or the Data Protection Board of
  India.

To exercise any right not available directly in the app, email `[CONTACT EMAIL]`. We aim
to respond within 30 days.

## 8. How long we keep it

We keep your data while your account exists, because the features are built on your own
history. When you delete your account, records are erased immediately. Backups are
purged on our provider's rolling backup schedule.

## 9. Users under 18

Anyone under 18 needs a parent or guardian's consent before Lunee processes any of
their health data.

How it works:

- We ask for a date of birth when an account is created. If it shows the person is
  under 18, we also ask for a parent or guardian's email address.
- The account is created in a waiting state. **No health data is recorded or analysed
  in that state** — health profiles, symptom and cycle logs, and report uploads are all
  blocked until consent is given.
- We email the parent or guardian a secure, single-use link valid for 14 days. They can
  approve or decline, and can withdraw their consent later using the same link.
- If consent is declined or withdrawn, processing stops immediately.
- We record that consent was given, by which email address, when, and from what device
  and network, so there is a verifiable record. The account holder cannot view or alter
  that record.

Partner and support-circle features (inviting, following, gifting) are not available to anyone
under 18.

A parent or guardian can contact `[CONTACT EMAIL]` at any time to withdraw consent or
request deletion of their child's account and data.

`[LAWYER: confirm that email-link confirmation meets the "verifiable parental consent"
standard for your launch markets, or specify the stronger verification required — see
docs/COMPLIANCE-NOTES.md §1.]`

## 10. Changes

We will post changes here and update the effective date. Material changes affecting how
your health data is used will be notified in the app before taking effect.

## 11. Contact

- Privacy: `[CONTACT EMAIL]`
- Grievance Officer (DPDP Act): `[GRIEVANCE OFFICER NAME]`, `[GRIEVANCE EMAIL]`
- `[LEGAL ENTITY]`, `[REGISTERED ADDRESS]`
