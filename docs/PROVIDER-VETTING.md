# Provider vetting checklist

Run this before `node scripts/approve-provider.mjs <applicationId> "<address>"`. Approving a provider
makes them visible to patients and lets them receive health data the patient chooses to share.
Record the outcome (who checked, when, what evidence) somewhere you can find later.

## Labs and diagnostic centres
- [ ] Legal entity name matches the application and can be found in the business register (MCA / GST).
- [ ] Accreditation: **NABL** certificate number checked on the NABL directory, or the lab states it is
      not accredited (then decide whether you list non-accredited labs at all).
- [ ] State clinical-establishment registration where applicable.
- [ ] A named pathologist / lab director with a valid registration.
- [ ] The listed address and phone number are real: call the number and ask the applicant to confirm
      the application from the email address on it.
- [ ] Price list is the lab's own; spot-check three prices against their website or a quote.

## Doctors and clinics
- [ ] Registration number checked on the **National Medical Register** (NMC) or the relevant State
      Medical Council for the doctor's stated qualification and name.
- [ ] Name on the registration matches the applicant; photo ID checked over video.
- [ ] Clinic address and phone verified as above.
- [ ] Specialties listed match the registration (no specialty claims without a qualification).
- [ ] For teleconsult: the doctor is registered in the state they practise and follows the
      Telemedicine Practice Guidelines.

## Everyone
- [ ] Signed data-processing agreement (`PROVIDER-DPA-TEMPLATE.md`, after legal review).
- [ ] The person understands: they see only what the patient shares, must not copy it elsewhere,
      and access ends when the patient cancels.
- [ ] No referral fee or payment between the provider and Lunee unless it is disclosed to patients.
- [ ] Add the address and coordinates when approving so distance sorting works.
- [ ] Set up a review process for complaints; remove a listing the same day for any credible
      safety issue (set `care_providers.verified = false`).

## After approving
- Confirm the provider can sign in, see the dashboard, and add services and slots.
- Re-verify annually and whenever a complaint is received.
