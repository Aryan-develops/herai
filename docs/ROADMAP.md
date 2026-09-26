# Lunee roadmap

Status: master task run completed. Live at https://lunee.me (web + API on Vercel, AI service on Render). Domain, Resend email (Lunee <hello@lunee.me>), Supabase URLs and passkey RP ID are set for lunee.me. IP India trademark search for LUNEE found no records (owner checked).

## Done
- Cycle module, Google OAuth, passkeys (built-in authenticator: Face ID / Touch ID / Windows Hello), DOB gate, guardian consent
- Soft-and-warm redesign on web and mobile, including dark mode on both (mobile applies on next app start)
- Conversational chat, Get help, care referrals (labs/doctors, consent-first sharing, reviews, slots, teleconsult, provider dashboard)
- Settings (tap the Lunee logo or the avatar): profile, sign-in and passkey management, password, partner sharing, notifications and language, appearance, data export, account deletion, help. Web and mobile.
- Partner Mode phases 1-5: invites by code and link in both directions, many-to-many links, per-item sharing scopes, derived summaries only, pause/remove, access log, mood check-ins with "I need..." signals, comfort list, cycle sub-phases (PMS, cramps) with confidence, curated tips in English and Hindi with safety filter and optional AI rewording, daily tasks with streak, 14-day outlook, plans that flag tougher days, feedback, daily support note (email/push), payments UI with provider fallback (unconnected), 14-day trial, gift codes
- Mobile: biometric app lock, push registration, invite deep links, partner home/sharing/upgrade screens
- Security: RLS on all tables, throttled invite codes, AI service rate limit, function hardening, first-party crash reporting
- Docs: privacy, store data-safety, terms, compliance notes 10-13, provider vetting checklist, provider DPA template
- Real app icon, splash and favicon

## Needs the owner (cannot be done in code)
0. **Done:** `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `CORS_ORIGIN`, `APP_BASE_URL` are set on the herai-api Vercel project. Still optional: `AI_SERVICE_URL` (+ `INTERNAL_API_TOKEN` on both Render and Vercel).
1. **(Old note) Vercel env vars on the herai-api project:** `CRON_SECRET` (any long random string) so the 09:00 IST support note runs; `RESEND_API_KEY` and `EMAIL_FROM` (verified domain) for guardian-consent and invite emails; optional `AI_SERVICE_URL` (+ `INTERNAL_API_TOKEN` on both Render and Vercel) to let the AI reword partner tips.
2. **Supabase dashboard:** turn on "Leaked password protection" (Auth > Passwords).
3. **Payments:** pick a provider account (Razorpay recommended), then implement its adapter in `apps/api/src/payments/providers.ts` and set `PARTNER_PAYWALL=true`.
4. **Legal:** lawyer review of PRIVACY, TERMS and the provider DPA; confirm the India helpline numbers; DPDP verifiable parental consent standard.
5. **Providers:** vet with `docs/PROVIDER-VETTING.md`, then `node scripts/approve-provider.mjs`.
6. **Native builds:** real passkeys and Face ID prompts in the phone app need an EAS/dev build, not Expo Go; app-store listings and screenshots.
7. **Custom domain (later):** change the passkey RP ID and re-register passkeys; upgrade Render (cold starts) when traffic grows.

## Later ideas
- Partner "hide everything" panic button and review of wording with a domestic-violence support organisation
- Mobile editing of provider services and slots (web only today)
- Insights and care-plan history views; observability dashboard for `client_errors`
- Passkey sign-in inside the native app
