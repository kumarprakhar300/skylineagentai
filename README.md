# Skyline Agent — Live Real-Estate AI Calling Agent

A production-style **AI voice calling agent** for real-estate lead qualification. The agent
("Agent" from Skyline Estates) holds a natural, interruptible phone conversation in **English,
Hindi, or Hinglish**, qualifies the caller (intent, location, budget, configuration, timeline),
scores the lead, writes a structured call summary, and stores everything in a database with a
searchable, exportable dashboard.

It runs in two channels from **one shared agent brain**:

- **Browser demo** — in-browser mic/speaker call with live transcript, confidence indicators, and
  re-transcription.
- **Phone demo** — real phone calls via Twilio (speech-to-text + text-to-speech).

```
        ┌───────────────┐   mic/speaker   ┌────────────┐
        │  /  (web UI)  │ ───────────────▶│   AI turn   │
        │ VoiceCall.tsx │◀─── TTS audio──│  logic      │
        └───────────────┘                 └─────┬──────┘
                                              │ chat / STT / TTS
        ┌───────────────┐   <Gather> speech   │   (Lovable AI Gateway)
        │  Twilio number │ ───────────────────▶│
        │  /phone setup  │◀── <Say> Polly ────┘
        └───────────────┘
                              │ end-call (webhook)
                              ▼
        ┌───────────────┐  lead + summary + score + transcript
        │  Lovable Cloud │  (Postgres: leads, calls, lead_activity)
        │   database    │
        └───────────────┘
```

---

## 🔗 Live Demo

- **Live app:** <https://skylineagentai.lovable.app>
- **Voice demo:** open the live app and click **Start call** (browser mic + speaker)
- **Phone demo:** follow the [Twilio setup](#live-twilio-phone-call-demo) below, then call your Twilio number

---



## What it does

| Capability | Where |
|---|---|
| Multi-turn, interruptible qualification conversation | `src/lib/agent/agent-turn.server.ts`, `src/lib/agent/prompt.ts` |
| Hindi / Hinglish / English language choice (incl. auto) | `src/lib/agent/language.ts`, language picker in `VoiceCall.tsx` |
| Domain vocabulary hints for accurate STT | `sttPrompt()` in `language.ts` |
| Live transcript with speaker labels + confidence bands | `SpeakerLabel.tsx`, `ConfidenceText.tsx` |
| Tap-to-re-transcribe low-confidence audio (HQ model) | `src/routes/api/stt.ts`, `confidence.ts` |
| Automated lead scoring (Hot/Warm/Cold, 0–100) | `src/lib/agent/score.ts` |
| Call summary generation | `summaryPrompt` in `prompt.ts`, `/api/end-call` |
| Editable project catalog (5 metro cities) | `src/routes/admin.tsx` → `project_catalog` table |
| Live property location map | `ProjectMap.tsx` (Google Maps) |
| Leads dashboard: filter, search, detail panel, CSV export | `src/routes/leads.tsx`, `LeadDetailPanel.tsx`, `src/lib/csv.ts` |
| Analytics dashboard | `src/routes/_authenticated/analytics.tsx` |
| Phone-call channel via Twilio | `src/routes/api/public/twilio/voice.ts`, `/phone` |
| Auth + role-based access (admin / agent) | `user_roles` table, RLS policies |

The agent pitches on **customer benefits** (price, commute, RERA status) rather than feature
lists, and reads the live catalog from the database so edits on `/admin` take effect without a
redeploy.

---

## Tech stack

- **Framework:** TanStack Start v1 (React 19, full-stack, SSR) on Vite 7
- **Styling:** Tailwind CSS v4 with oklch design tokens, 3D glass/depth utilities
- **Backend:** Lovable Cloud (Postgres) with row-level security + RBAC
- **AI:** Lovable AI Gateway — chat (`gemini-3.6-flash`), STT
  (`gpt-4o-mini-transcribe`, HQ `gpt-4o-transcribe`), TTS (`gpt-4o-mini-tts`)
- **Phone:** Twilio Programmable Voice (Polly `Aditi` / `Raveena` for Hindi/English)
- **Maps:** Google Maps via the Google Maps connector

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+ and a package manager (`npm`, or `bun`/`pnpm`)
- A Lovable Cloud project with the database enabled (the migrations create the schema)
- For the **phone demo**: a [Twilio](https://www.twilio.com/) account with a voice-capable number

> The app is built on Lovable. The AI Gateway and Lovable Cloud backend are provisioned by Lovable;
> you don't need separate OpenAI/Google/Gemini API keys.

---

## Project structure

```
src/
├─ routes/
│  ├─ index.tsx              # Landing + browser voice demo
│  ├─ phone.tsx              # Twilio setup guide
│  ├─ leads.tsx              # Leads & calls dashboard (filter/search/CSV)
│  ├─ docs.tsx               # Docs page
│  ├─ auth.tsx               # Sign in / sign up
│  ├─ _authenticated/         # Auth-gated pages (admin, analytics)
│  └─ api/
│     ├─ turn.ts             # One agent turn (browser channel)
│     ├─ stt.ts              # Speech-to-text (+ re-transcribe)
│     ├─ tts.ts               # Text-to-speech
│     ├─ end-call.ts         # Finalize: summary + score + persist
│     └─ public/twilio/voice.ts  # Twilio webhook (phone channel)
├─ components/               # VoiceCall, LeadDetailPanel, ProjectMap, etc.
└─ lib/
   ├─ agent/                 # Shared agent brain (prompt, flow, score, language)
   ├─ ai.server.ts           # Lovable AI Gateway helpers
   ├─ csv.ts                 # CSV export with Hindi-safe BOM + formula injection guard
   └─ twilio-signature.server.ts  # Twilio request signature verification

supabase/migrations/         # Schema: leads, calls, lead_activity, project_catalog, user_roles
```

---

## Setup — run the app locally

### 1. Install dependencies

```sh
git clone <your-repository-url>
cd skyline-agent
npm install        # or: bun install
```

### 2. Environment

Lovable Cloud secrets are injected automatically when you run on Lovable. For a fully local run
you need the following in a `.env` (or via your Lovable project secrets):

```sh
# Lovable Cloud backend (auto-managed on Lovable)
SUPABASE_URL=...
SUPABASE_PUBLISHABLE_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...

# Lovable AI Gateway key (auto-managed on Lovable)
LOVABLE_API_KEY=...

# Google Maps (optional, for the live property map)
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=...

# Twilio (only for the phone demo — see below)
TWILIO_AUTH_TOKEN=...
```

> If you connected this project to GitHub from Lovable, the committed code already contains the
> client-side (`VITE_*`) config. Server-only secrets like `LOVABLE_API_KEY` and `TWILIO_AUTH_TOKEN`
> are never committed — they live in Lovable's secret store.

### 3. Apply database migrations

On Lovable Cloud the migrations in `supabase/migrations/` run automatically. To run them locally
against your own Supabase/Lovable Cloud project, apply the SQL files in order (they create the
`leads`, `calls`, `lead_activity`, `project_catalog`, and `user_roles` tables with RLS policies and
grants).

### 4. Start the dev server

```sh
npm run dev
```

Open the printed local URL (default `http://localhost:8080`). The first signed-up user becomes the
admin; later sign-ups get no staff role until an admin promotes them on `/admin`.

### 5. Try the browser demo

1. Open `/` (the landing page).
2. Pick a **language** next to **Start call**: Auto / English / Hindi / Hinglish.
3. Click **Start call** and allow microphone access.
4. Talk to the agent — answer the qualification questions, ask about the project, or interrupt.
5. End the call. A summary, score, and transcript are saved; review them under **Leads & calls**.

---

## Live Twilio phone-call demo

The browser demo and the phone demo share the same agent brain. To receive real phone calls:

### 1. Get a Twilio number

1. Sign in to the [Twilio Console](https://console.twilio.com/).
2. Buy or use a trial **voice-capable** phone number
   (Phone Numbers → Manage → Buy a number).
3. Note your **Account SID** and **Auth Token**
   (Console dashboard → "Account SID & Auth Token").

### 2. Save the Twilio auth token

The webhook **verifies every request's signature** using HMAC-SHA1, so you must store the token
before the webhook will accept calls:

1. In your Lovable project, open **Secrets** and add a secret named `TWILIO_AUTH_TOKEN` with your
   Twilio Auth Token value.
2. Until this is set, the webhook returns `503 Webhook not configured` and rejects all requests —
   so no forged calls can get through.

### 3. Publish the app

The webhook must be publicly reachable. Publish the app from the Lovable editor (or your stable
production URL):

```
https://<your-project>.lovable.app
```

### 4. Point the Twilio number at the webhook

In the Twilio Console, open **Phone Numbers → your number → Voice & Fax / Messaging** and set:

- **A call comes in:** `Webhook`
- **URL:** `https://<your-project>.lovable.app/api/public/twilio/voice`
- **HTTP method:** `POST`

### 5. Call the number

- The agent answers in Hinglish, then mirrors whatever language you reply in (Hindi/English/Hinglish).
- Twilio's speech recognition transcribes each answer; the agent decides the next question.
- The call ends politely once the requirement and contact details are captured.
- The record appears under **Leads & calls** with channel `phone`.

> The `/phone` page in the app shows this same step-by-step guide and a copy of your live webhook
> URL.

### How the phone channel works

1. Twilio POSTs the call to `/api/public/twilio/voice`.
2. The handler verifies the `X-Twilio-Signature` against `TWILIO_AUTH_TOKEN`.
3. It reads the caller's speech transcript from the Twilio payload, runs one `agentTurn`, and
   replies with TwiML `<Say>` (Polly `Aditi` for Devanagari Hindi, `Raveena` for English) plus a
   `<Gather>` to capture the next answer.
4. Each turn appends to the conversation state until the agent closes the call.
5. On close, the same finalize path used by the browser writes the lead, call summary, score, and
   transcript.

---

## Demo walkthrough script (≈3 min)

A ready-to-read script for presenting the live walkthrough in an interview or demo call.
Each step maps to a screen you can show; keep the app open on the published URL first.

**1. Landing + browser voice call (~75 s)**
- Open the live app. Point out the language picker (Auto / English / Hindi / Hinglish) and
  **Start call** button.
- Pick **Hindi** and click **Start call**. Allow mic access.
- Speak a realistic lead line, e.g.:
  > "Mujhe Pune mein 2 BHK chahiye, budget around 80 lakh, possession agle saal chahiye."
- Let the agent ask follow-ups (location, budget, timeline, contact). Interrupt once to show
  barge-in. Mention the live transcript with speaker labels and confidence bands.
- Click **End call**. Note the generated summary and Hot/Warm/Cold score.

**2. Leads dashboard (~45 s)**
- Open **Leads & calls**. Show the filter bar (location, budget, date, channel, score band).
- Click a lead row → slide-in detail panel → **Transcript** tab (chat-style, searchable).
- Click **Export CSV** to show the Hindi-safe export with BOM.

**3. Analytics (~20 s)**
- Open **Analytics**. Highlight lead volume by score band and channel split.

**4. Admin catalog edit (~20 s)**
- Open **Admin**. Tweak a project's price or amenity live; explain the agent reads it on the next
  call without a redeploy.

**5. Phone channel (optional, ~20 s)**
- If a Twilio number is wired, dial it live; otherwise show the `/phone` setup page and the signed
  webhook URL, and state that the same agent brain powers both channels.

> Tip: keep a second lead line ready (different city / budget) so you can show a second scored call
> without dead air.

---

## Troubleshooting checklist

If something does not work during the demo, run through this list first:

**Browser voice call**
- [ ] Mic permission granted? Check the browser's address-bar icon; retry on `localhost` / HTTPS.
- [ ] No transcript appearing? Confirm the AI Gateway key is set (`LOVABLE_API_KEY`) — the agent
      returns a fallback line if STT fails, but a fully blank transcript means the key is missing.
- [ ] Robot voice silent? System volume / browser autoplay policy — click anywhere on the page once.
- [ ] Chrome blocked autoplay audio? Interact with the page (click) before **Start call**.
- [ ] Hinglish words look garbled? Ensure you picked the right language; "Auto" defers to the model.

**Leads / analytics / admin**
- [ ] No leads showing? You must complete at least one call first; the dashboard reads from the
      `calls` + `leads` tables.
- [ ] `/admin` redirects to sign-in? Only the admin role can access it — the first sign-up is admin;
      promote others from `/admin`.
- [ ] Admin edits not reflected in calls? The agent reads the catalog live per turn — start a fresh
      call (edits do not retroactively change saved transcripts).
- [ ] CSV opens with broken Hindi in Excel? The export already includes a UTF-8 BOM; open via
      **File → Open** (not double-click) if your Excel locale mangles it.

**Twilio phone demo**
- [ ] Webhook returns `503 Webhook not configured`? `TWILIO_AUTH_TOKEN` secret is not set — add it.
- [ ] Call drops / no answer? Confirm the webhook URL is the **published** HTTPS URL
      (`/api/public/twilio/voice`), method **POST**, and the app is published (not just dev preview).
- [ ] Agent silent on the phone? Twilio trial accounts need the caller number **verified** first.
- [ ] Wrong language on phone? The agent mirrors the caller's language; speak Hindi or Hinglish to
      switch.
- [ ] Signature errors in logs? Re-copy the Auth Token exactly (no trailing whitespace) into the
      `TWILIO_AUTH_TOKEN` secret.

**General / build**
- [ ] `npm run dev` fails? Run `npm install` first; Node 18+ is required.
- [ ] Database errors? On Lovable Cloud the migrations auto-apply; locally, apply the SQL files in
      `supabase/migrations/` in order.
- [ ] Blank page on publish? Check the browser console — a missing `VITE_SUPABASE_*` env var is the
      usual cause.

---

## Admin & catalog editing

- `/admin` (admin role only) lets you edit the dummy project catalog — amenities, configurations,
  pricing, possession timeline, location coordinates — **without redeploying**. The agent reads
  live values from the `project_catalog` table on each call.
- The catalog ships with 5 demo projects across **Pune, Mumbai, Delhi NCR, Bengaluru, and
  Hyderabad**, each with customer-benefit–oriented pitch points.

---

## Leads dashboard

`/leads` provides:

- **Filter bar** — search transcripts, summaries, and metadata by location, budget, date, channel,
  score band, and status.
- **Lead detail panel** — sliding sheet with tabs for summary, score signals, follow-up notes, and
  a searchable chat-style transcript.
- **CSV export** — leads + call summaries + turn-by-turn transcript, with a UTF-8 BOM so Hindi /
  Hinglish renders correctly in Excel, and formula-injection neutralization on every cell.

---

## Security notes

- Auth via Lovable Cloud (email + Google social auth). The **first** sign-up becomes admin;
  subsequent users get no staff role until promoted.
- All tables use row-level security scoped by `has_role()`; broad staff policies were replaced with
  role-scoped checks.
- The Twilio webhook rejects unsigned/unsigned-incorrect requests.
- `/api/end-call` validates its body with Zod (typed + length-capped).

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

---

## Built with

- TanStack Start · React 19 · TypeScript
- Tailwind CSS v4 (oklch design tokens, 3D glass/depth)
- Lovable Cloud (Postgres + RLS + RBAC)
- Lovable AI Gateway (chat / STT / TTS)
- Twilio Programmable Voice · Google Maps

---

## License

Demo project built for a real-estate AI calling agent interview. Project data is fictional.
