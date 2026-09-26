# Lunee

Agentic AI-Powered Multimodal Women's Health Intelligence & Personalized Care Platform.

> Lunee is a health information and risk-awareness support tool. It does not provide
> medical diagnoses and is not a substitute for professional medical care.

## Status: Phase 5 — RAG (Retrieval-Augmented Generation)

- [x] Monorepo skeleton: `apps/web` (React+Vite+TS+Tailwind), `apps/api` (Node+Express+TS+Mongoose),
      `apps/ai-service` (Python+FastAPI)
- [x] Auth: register / login / logout, JWT (httpOnly cookie), bcrypt password hashing, protected routes
- [x] `User` + `HealthProfile` models
- [x] Landing, login, register pages + empty dashboard shell
- [x] Phase 2 — onboarding, symptom/cycle logging, health timeline
- [x] Phase 3 — agentic AI core: 6-agent pipeline (Intake, Symptom Analysis, Women's Health
      Intelligence, Risk Assessment, Safety/Triage hard gate, Care Planner) orchestrated in
      `apps/ai-service`, streamed over SSE into a chat UI at `/chat` that shows each agent step
      live, plus a confidence indicator, follow-up questions, and an emergency banner. Runs on
      `MockLLMProvider` under `DEMO_MODE=true` — see "Using a real LLM" below to swap in one later.
- [x] Phase 4 — Document Intelligence: a document upload (PDF/JPG/PNG) enters the SAME orchestrator
      as chat, just at the new Document Intelligence Agent instead of Intake — OCR/text extraction
      (real `pypdf` text-layer extraction for PDFs; image OCR via `pytesseract` when Tesseract is
      installed, otherwise an honest low-confidence result) → deterministic regex-based structured
      value extraction + range validation (never invents a value) → Document Intelligence Agent →
      Women's Health Agent (if a relevant lab parameter is present) → Risk Assessment Agent (now
      folds in abnormal lab values as factors) → Safety/Triage gate (now also trips on a
      `critical_low`/`critical_high` lab value directly) → Care Planner (adds report-grounded
      "discuss with clinician" items). Persisted as a `HealthReport` in `apps/api` (Mongo), with
      every pipeline run — chat- or document-triggered — logged as an `AgentExecution` record for
      the future Phase 6 observability dashboard. Frontend: `/reports` (drag/drop upload with live
      step-by-step pipeline visibility) and `/reports/:id` (extracted table, AI explanation,
      cross-report trend charts, risk factors, care plan, "questions to ask your doctor", and an
      emergency banner when the Safety Agent fires). 3 synthetic demo lab reports (clearly labeled,
      not real data) live in `apps/ai-service/demo_reports/` — regenerate via
      `python scripts/generate_demo_reports.py`.
- [x] Phase 5 — RAG: 18 knowledge-base documents (`apps/ai-service/knowledge/*.json`, ~500 words
      each — 14 grounded in real, verified URLs from MedlinePlus/NIH/NICHD/CDC/Mayo Clinic/WHO/
      Office on Women's Health, 4 explicitly `"source": "synthetic-demo"` where content is Lunee's
      own editorial judgment rather than an external citation) chunked (~220 words, 40-word overlap)
      and embedded via `LLMProvider.embed()` by `scripts/ingest_knowledge.py` into
      `knowledge_index.json`, searched by a new `KnowledgeRetrievalAgent` (`app/knowledge/store.py`
      — cosine similarity over a lightweight file-backed store, swappable for MongoDB Atlas Vector
      Search later without touching any agent). Wired as a real pipeline stage — Intake → Safety
      pre-check → **Knowledge Retrieval** → [Symptom Analysis + Women's Health, now grounded in
      retrieved chunks] → Risk → Safety gate → Care Planner — in both the chat and document
      pipelines. The final response's `sources[]` is built only from chunks that actually cleared
      the similarity threshold (0.12) — empty, never fabricated, when nothing relevant is found.
      `MockLLMProvider.embed()` was upgraded from a whole-string hash (no semantic signal at all)
      to a hashed bag-of-words embedding (a real, if simple, retrieval technique — TF-style token
      hashing into a 4096-dim space), which is what actually makes mock-mode retrieval meaningful:
      a PCOS-worded query really does score highest against the PCOS documents. Frontend: an
      expandable "Sources" section (title + real link, or an explicit "Demo knowledge base" label
      for synthetic entries) on both the chat UI and the Report Analysis page.
- [ ] Phase 6 — care plans, insights, cycle module, agent observability dashboard
  - [x] Cycle module: `GET /logs/cycles/insights` (`apps/api/src/lib/cycleInsights.ts`) derives period
        history purely from existing `cycle_logs` entries (no new table) — groups consecutive
        logged days into periods, averages observed cycle length (falling back to
        `health_profiles.cycle_length_days`/`last_period_start` when history is thin), and returns
        current cycle day, phase (menstrual/follicular/ovulation/luteal), predicted next period,
        a 5-day-before-to-1-day-after fertile window around estimated ovulation (14 days before the
        next predicted period), and a regular/irregular call from the spread of observed lengths.
        Surfaced as `/cycle` in web (new nav item) and a `Cycle` tab in mobile — both hand-ported,
        same convention as the rest of the client split.
  - [ ] Insights, care plans, agent observability dashboard — not started
- [ ] Phase 7 — demo polish (seed data, `/demo` route, tests, docs)

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, React Router |
| Backend API | Node.js, Express, TypeScript — gateway over Supabase |
| AI service | Python, FastAPI (agent orchestration, RAG, OCR) |
| Database | Supabase (hosted Postgres) with row-level security; report files in Supabase Storage |
| Auth | Supabase Auth — bearer access/refresh tokens (no cookies, so the same flow works on mobile) |
| LLM | Anthropic Claude (`app/llm/anthropic_provider.py`), or `MockLLMProvider` under `DEMO_MODE=true` |
| Embeddings | BGE-small via ONNX, run locally — no API cost, no health data sent to a vendor |

## Getting started

Requires Node.js 20+ and Python 3.11+. Docker is optional (only needed if you use `docker-compose.yml`).

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env` first (Supabase
dashboard → Settings → API). The service-role key is server-side only — it must
never reach `apps/web` or `apps/mobile`.

This starts:
- `apps/api` on http://localhost:4000 (Express gateway over Supabase)
- `apps/web` on http://localhost:5173 (proxies `/api/*` to the backend)

To run the AI service (Python, skeleton only until Phase 3):

```bash
cd apps/ai-service
python -m venv .venv
.venv\Scripts\activate      # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Database

Schema, row-level security policies and the `reports` storage bucket live in Supabase.
Every table is RLS-scoped to `auth.users`, and a signup trigger provisions the user's
`profiles` + `health_profiles` rows.

### Using a real LLM instead of the mock provider

Set `DEMO_MODE=false`, `LLM_PROVIDER=anthropic`, and `LLM_API_KEY` in `.env`.
`LLM_MODEL` defaults to `claude-sonnet-5`. Then rebuild the knowledge index (below) —
the provider change also changes the embedding space.

### Knowledge base index and similarity threshold

Embeddings from different models are not comparable, so the index is stored per
embedding space — `knowledge_index.<space>.json` — and the retrieval cutoff is too.
Both spaces are committed, so RAG works out of the box in either mode:

| Space | Produced by | Threshold |
|---|---|---|
| `bow-4096` | `MockLLMProvider` (hashed bag-of-words) | 0.12 |
| `bge-small-en-v1.5` | local ONNX embedder (real provider) | 0.61 |

After editing `apps/ai-service/knowledge/*.json` or changing embedding provider:

```
cd apps/ai-service
.venv/Scripts/python.exe scripts/ingest_knowledge.py    # rebuild the index
.venv/Scripts/python.exe scripts/tune_threshold.py      # re-measure the cutoff
```

Then update `MIN_SIMILARITY_BY_SPACE` in `app/knowledge/store.py` with the suggested
value. Don't eyeball it: dense-embedding scores for *unrelated* text still land around
0.47–0.54, so a threshold that looks conservative can admit the entire corpus.

### Parental consent (users under 18)

Registration captures a date of birth. Under-18 accounts start in `pending` and every
health-data route returns `403 PARENTAL_CONSENT_REQUIRED` until a guardian approves via
an emailed one-time link (`/consent/:token`). Guardians can withdraw at any time, which
re-blocks the account. See `docs/COMPLIANCE-NOTES.md` §1 for what is still open.

In development no email is sent — the consent link is printed to the API log:

```
[consent] Link:     http://localhost:5173/consent/<token>
```

### Health data in logs

Agent prompts and results contain the user's symptoms, conditions, medications and
free-text query. They are logged only when `LOG_HEALTH_DATA=true`, which must stay
`false` anywhere real users exist — the always-on logs record counts, not content.

## Mobile app (apps/mobile)

Expo + TypeScript + React Navigation, hitting the same `apps/api` gateway and the
same Supabase project as the web app — same account, same data, on either client.
`lib/api.ts`/`context/AuthContext.tsx` are direct ports of the web versions; the only
differences are forced by native having no cookies and no DOM (bearer tokens in
SecureStore instead of a cookie jar, an absolute `API_URL` instead of Vite's dev
proxy). Chat streaming and report upload are stubbed pending Phase 4.

```bash
cd apps/mobile
npm install
npx expo start        # then press "a" (Android emulator), "i" (iOS simulator, macOS
                       # only), or scan the QR code with Expo Go on a physical device
```

The gateway URL defaults to the right thing for an emulator (`10.0.2.2` on Android,
`localhost` on iOS/web) — see `src/config.ts`. Testing on a **physical device**
needs your machine's LAN IP instead: copy `.env.example` to `.env` and set
`EXPO_PUBLIC_API_URL=http://<your-LAN-IP>:4000/api`, since "localhost" on a phone
means the phone itself.

`npx expo start --web` also works, for fast UI iteration without a device or
simulator — not a shipped target (the stores are), but useful in development.

## Project structure

```
herai/
  apps/
    web/          React frontend
    mobile/        Expo + React Native app (iOS/Android)
    api/           Express gateway (auth, data APIs) over Supabase
    ai-service/    FastAPI service (agent orchestration, RAG, OCR)
  docker-compose.yml   optional, for Docker-based deployment
  .env.example
```
