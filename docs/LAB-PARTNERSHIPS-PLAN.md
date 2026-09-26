# Labs and tests: how to connect and earn

Status: plan, not built. Nothing here has been checked with a lawyer or CA. Figures marked *(assumption)* are
placeholders to replace with real quotes. Read `COMPLIANCE-NOTES.md` and `PROVIDER-VETTING.md` first.

## What exists today
- Directory of labs, doctors and clinics with services, prices, slots, ratings, distance (location, opt-in).
- "Tests worth asking about" on a lab report (`SuggestedTests`) matched to partners that offer them.
- Requests: a person asks a provider for a test or appointment and shares chosen data; access ends when she cancels.
- Provider dashboard (inbox, services, slots). Approval by script with the vetting checklist.
- Payments layer (Razorpay/Cashfree/Stripe adapters, unconnected) built for Partner Mode; reusable here.
- No money flows between Lunee and providers yet. No order, payout or commission tables.

## The core rule
Ranking, suggestions and AI answers must never depend on who pays us. Show any commission or listing fee
in plain words on the provider page ("Lunee may earn a fee if you book"). This is already required in
`COMPLIANCE-NOTES.md` and it is also what keeps trust, app-store review and regulators happy. Everything
below assumes it.

## Ways to earn, from safest to riskiest

| # | Model | Who pays | How it works | Risk |
|---|-------|----------|--------------|------|
| 1 | Affiliate / referral from a lab chain or aggregator | Lab, per completed booking | Send the person to the lab's booking (deep link or API). Lab pays a share of the booking value after the sample is collected. Typical range is 5-20% *(assumption, ask each lab)*. | Low. Needs disclosure and a clean tracking link. |
| 2 | Marketplace: Lunee collects, pays the lab | Person pays Lunee, Lunee keeps a margin | Checkout in Lunee, split payment (Razorpay Route or Cashfree Easy Split), lab settles minus our fee. | Medium. GST on our fee, TCS as e-commerce operator, refunds and quality disputes land on us. |
| 3 | Listing / software subscription | Independent labs and clinics | Flat monthly fee for a profile, slot booking, dashboard, reports upload. No per-patient cut. | Low. This is the model to use for **doctors**. |
| 4 | Package sales (own-brand health checks) | Person | Curated panels (thyroid + iron + vitamin D + hormones for PCOS) sold at a fixed price, fulfilled by a partner lab. | Medium. We choose and market a clinical bundle; needs a doctor to sign off the content. |
| 5 | Sponsored placement | Provider | Clearly labelled "Sponsored", never mixed into "nearest" or "recommended". | Medium. Easy to erode trust. Do last, if at all. |

Do not sell or share health data with anyone for money. DPDP Act consent rules and our own privacy policy forbid
it, and it would end the product.

### Doctors need special care
The National Medical Commission's ethics rules bar doctors from paying or receiving commission for referrals.
Do not take a percentage of consultation fees or pay for patient referrals. Charge doctors a flat software or
listing fee only, and get a lawyer's opinion on the wording before launch. Teleconsults must follow the
Telemedicine Practice Guidelines (registered practitioner, consent, records).

## Recommended path

### Phase 0: prove demand, no money moves (2-4 weeks)
- Pick **one city** where you can meet labs in person.
- Count real behaviour: opens of Find care, "Request" taps, tests suggested vs requested. Ask 20 users what
  stopped them booking.
- Get written terms from 3 to 5 labs or aggregators: commission %, payout timing, tracking method, whether they
  offer an API or only links, home collection charges, report delivery (PDF email, app, API).
- Deliverable: a one-page comparison and the top 2 partners.

### Phase 1: affiliate bookings (first revenue, 4-8 weeks)
- Sign an affiliate or partner agreement with 1-2 chains/aggregators, and 5-10 local independent labs (model 3
  pilot, first 3 months free).
- Add `provider_orders` (person, provider, test list, status, price, our fee, source link id) and record each
  handoff. Use the partner's tracking parameter; reconcile against their monthly statement.
- Show "Lunee may earn a fee" on the provider page and in Terms.
- Add a lab-report import: after the visit the person uploads the PDF (already supported) and we suggest what to
  discuss with a doctor. That is the loop that brings people back.
- Deliverable: first paid bookings and a monthly reconciliation routine.
- Legal: register the business (Pvt Ltd or LLP), GST registration, agreement templates reviewed, DPA
  (`PROVIDER-DPA-TEMPLATE.md`) signed by every provider we share data with.

### Phase 2: in-app booking and payment (model 2, 2-3 months later)
- Connect a real payment provider (already the top item in `ROADMAP.md`) with split settlements.
- Slots come from `provider_slots` (independents) or the aggregator's API.
- Add `payouts` and `commission_ledger`, refund and cancellation rules, lab-side "sample collected" webhook or a
  manual confirm in the provider dashboard.
- Handle: GST invoice for our fee, TCS if we collect for the lab, customer support (support form exists), SLA
  for lab delays.
- Deliverable: end-to-end booking with money moving automatically.

### Phase 3: depth
- Curated panels for PCOS, thyroid, anaemia, fertility, pregnancy planning, reviewed by a named doctor.
- Recurring tests (reminder to repeat a value in 3 months), subscription "health check" plan.
- ABHA/ABDM integration for pulling reports with consent, once the NHA sandbox approval is done.
- Employer or insurer programs (B2B): they pay a per-member fee; individual data stays private.

## How to connect technically
1. **Links first.** Every provider gets a `booking_url` and a tracking param. Fastest way to ship Phase 1.
2. **Provider dashboard** for independents: they already see requests; add order status, price list edits,
   report upload back to the patient (with consent).
3. **Aggregator API** when they offer it: search by pincode, availability, price, book, status webhook. Wrap in a
   `BookingProvider` interface like `PaymentProvider` so labs can be swapped or added.
4. **Payments** behind the existing `PaymentProvider` abstraction with split settlement for model 2.
5. **Reconciliation job** monthly: our orders vs the partner statement, flag mismatches.

## Unit economics (fill with real numbers)
Illustrative only, all *(assumption)*:
- Average basket Rs 1,200, commission 12% = Rs 144 per completed booking.
- 1,000 monthly active women, 6% of them book a test in a month = 60 bookings = about Rs 8,600/month.
- 10,000 monthly active, same rate = about Rs 86,000/month before tax and support cost.
- Independent lab listing at Rs 999/month x 30 labs = about Rs 30,000/month.
The number that matters is booking conversion. Measure it in Phase 0 before promising anything.

## Compliance checklist before any money moves
- [ ] Business entity, bank account, GST registration; CA confirms GST on our fee and TCS duty.
- [ ] Agreement with each lab: fee, payout terms, quality, data handling, complaint process, termination.
- [ ] DPA signed with each provider; provider vetting done (`PROVIDER-VETTING.md`).
- [ ] Terms and Privacy updated: referral fees disclosed, what is shared with a lab and when, deletion.
- [ ] Consumer protection: clear prices, refund policy, grievance officer named (e-commerce rules).
- [ ] Doctors: flat fee only, lawyer sign-off, teleconsult guidelines followed.
- [ ] No ranking or AI suggestion influenced by payment; keep a test that proves it.
- [ ] Store listings: Play/App Store health-data and payments declarations updated.

## Risks and how to limit them
- **Trust loss if it looks like an ad platform.** Keep suggestions clinical, label fees, keep "nearest" honest.
- **Lab quality problems land on our brand.** Vet, prefer NABL-accredited, publish reviews, remove fast.
- **Regulatory change.** Keep doctors on flat fees and let a lawyer review before any per-booking model for clinics.
- **Cash-flow and refunds in model 2.** Start with affiliate (model 1), which has none.
- **Data misuse.** Share only what the person chooses per request; access log and cancel already exist.

## Owner decisions needed
1. Which city first.
2. Company entity and GST status.
3. Whether to start with one aggregator (fast) or local labs (slower, better margin and relationships), or both.
4. Who signs off clinical content for panels (a named doctor).
5. Lawyer and CA to hire for the checklist above.
