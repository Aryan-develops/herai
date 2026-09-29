# IP-SAKTI Sahayak

A multilingual assistant for intellectual property and regulatory guidance in Ayurveda. Built for Smart India Hackathon 2026, problem statement **SIH26045** (Ministry of Ayush).

**This is a frontend prototype.** All answers come from a small, typed demo corpus in `src/data`, and every "API call" is simulated with a 600–900 ms delay.

## Run it

```bash
cd ip-sakti-sahayak
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build into dist/
```

## What's inside

| Page | What it does |
|---|---|
| **Assistant** (`/`) | Chat with suggested questions, an India / International jurisdiction toggle that never mixes answers, cited answer cards with a confidence meter, a sources panel, refusal and "needs an advocate" cards, mock voice input, text-to-speech, and chat history. |
| **Classify Product** (`/classify`) | A three-step wizard that places a product in one of six categories (Classical, Patent/Proprietary, New drug, Phytopharmaceutical, Ayurveda Aahar, Cosmetic), plus a comparison table. |
| **ABS Helper** (`/abs`) | A wizard that builds an ordered access-and-benefit-sharing checklist, with separate India and International tabs and print-to-PDF. |
| **TKDL and Prior Art** (`/tkdl`) | A fuzzy search over demo classical formulations, showing the source text, chapter and a similarity score. |
| **Sources Library** (`/sources`) | All corpus sources, with search, jurisdiction and type filters, and a detail drawer. |
| **Help and Escalation** (`/help`) | A request form for an IP facilitator, with a DPDP Act consent step and past requests. |
| **Permissions and audit log** | Free official databases are always on. Paid subscriptions need the name typed in plus explicit consent. Every grant, revoke and search is logged with a timestamp. |

Languages: English and Hindi ship with full UI text. Tamil, Bengali, Marathi, Telugu, Gujarati and Kannada are selectable "via Bhashini"; their UI text falls back to English.

## Structure

```
src/
  data/        typed mock corpus: sources, topics (India + International answers), classify, ABS, TKDL, permissions
  services/    api.ts (the async boundary to swap for a real backend) and matcher.ts (keyword routing, abstention, litigation detection)
  store/       Zustand store, persisted to localStorage (theme, language, chats, permissions, audit log, requests)
  components/  AnswerCard, CitationChip, ConfidenceBar, JurisdictionToggle, Wizard, SourceDrawer, layout, UI primitives
  pages/       one file per route
  i18n/        UI strings (en, hi) and language list
```

To connect a real backend, replace the bodies of the functions in `src/services/api.ts`. The components only depend on their return types.

To try the error states, run `localStorage.setItem('ipsakti:failRate', '0.5')` in the browser console and reload. Remove the key to go back to normal.

## Design notes

- Colour tokens are CSS variables in `src/index.css`, with light and dark sets. Components use semantic names (`bg-primary`, `text-muted`, `bg-intl-soft`) rather than raw hex values.
- Deep green (`#0F5132`) marks India and a blue accent marks International, so the active jurisdiction is always visible. Saffron (`#E8A317`) is used sparingly, for the active citation and highlights.
- Inter is used for the UI, Fraunces for page titles, and Noto Sans Devanagari for Hindi.
- Accessibility: a skip link, visible 3px focus rings, focus-trapped dialogs that return focus on close, labelled icon buttons, `prefers-reduced-motion` support, 44px touch targets, and confidence shown in words as well as colour.
- The mobile bottom bar shows four tabs plus **More**, following the five-item limit for bottom navigation.

## Disclaimer

Source summaries are plain-language paraphrases written for this prototype and may be out of date. They are not legal advice. Always check the official text through the links provided.
