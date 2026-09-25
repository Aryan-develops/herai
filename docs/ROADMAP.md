# HERAI roadmap (revised)

Status as of commit bce76ad. Live: web (herai-web-kappa.vercel.app), API (Vercel), AI service (Render free tier).

## Done
- Cycle module, Google OAuth, passkeys, DOB gate, guardian consent
- Soft-and-warm redesign: web (all main pages) + mobile (Dashboard, Cycle, Chat, LogEntry, Login, care screens)
- Conversational chat bot, off-topic guard, Get help button
- Care referrals: nearby labs/doctors, consent-first sharing, test suggestions, reviews, price/turnaround, slots, teleconsult, provider dashboard (web full, mobile inbox + availability)

## 1. Finish mobile redesign (next, small)
Screens still on old styling: Register, Onboarding, Reports list, Report detail polish, Timeline, Consent.
Use `apps/mobile/src/theme.ts` warm tokens + `components/ui.tsx`. Typecheck with `npx tsc --noEmit` in `apps/mobile`.

## 2. QA not yet done (no code, just look)
- Web: Login, Register, ConfirmDOB, ConsentPending screens after restyle
- Deployed `/care`, `/care/:id`, `/provider`
- Mobile: Chat, Get help, provider screen, report suggestions

## 3. Partner Mode (approved plan, paused)
Order: (1) DB schema + code/link invites + partner links + mood log -> (2) cycle sub-phases + PartnerGuidanceAgent + partner home -> (3) payment UI (Rs100/mo, 14-day trial, gift, UPI/cards, provider fallback, AutoPay UI; unconnected) -> (4) nudges, mood cards, comfort list, feedback, lessons, localisation -> (5) privacy docs, audit log, rate limits, tests -> (6) real payment keys later.
Full spec: `C:\Users\Aryan\.claude\plans\am-thinking-of-making-starry-coral.md` (Part B).

## 4. Settings tab (build next, after item 1)
Opens when the user taps the HERAI logo/name (web header + mobile Home header); also reachable from the account menu. Web `/settings`, mobile `SettingsScreen`. Sections:
- **Sign-in and security**: list passkeys (`supabaseBrowser.auth.passkey.list()`), "Add a passkey" (Face ID / Touch ID / Windows Hello; the registration code already asks for the platform authenticator in `apps/web/src/lib/passkey.ts`), rename/remove a passkey, active sign-in methods (password, Google), change password. On the Dashboard, keep the one-time passkey nudge but link it to Settings.
- **Mobile biometric unlock**: "Unlock with Face ID" using `expo-local-authentication`, session kept in SecureStore. Real passkeys on native need a dev/production build, not Expo Go.
- **Profile**: name, date of birth (locked for minors), health profile edit.
- **Privacy and data**: consent status, data sharing with providers (active requests, revoke), export my data, delete account (removes the pending "account deletion UI" TODO).
- **Notifications** (ready for Partner Mode nudges), **appearance** (dark mode toggle), **about/help** (Get help numbers, privacy policy, terms).
- Later: Partner section (invite code, scopes, pause/revoke) once Partner Mode lands.

## 4b. Polish
- Dark mode (web + mobile)
- Mobile provider service/slot editing

## 5. Before real users (compliance, `docs/COMPLIANCE-NOTES.md`)
- Update PRIVACY + store data-safety for provider sharing
- Provider credential vetting + data-processing agreement; referral-fee disclosure
- AI service auth (still open), real app icon, crash reporting
- Real email delivery for guardian consent
- Confirm India helpline numbers (112/108/181/14416)

## 6. Ops
- Render cold starts: upgrade ($7/mo) when real traffic
- Custom domain later: change passkey RP ID, re-register passkeys
- Approve real providers: `node scripts/approve-provider.mjs <applicationId> "<address>"` in `apps/api`
- Phase 6 leftovers: insights, care plans, observability
