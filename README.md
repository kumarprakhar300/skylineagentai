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

### 2. Environment variables

Lovable Cloud auto-injects the managed secrets below when you run the app on Lovable. For a fully
local run, or to verify the demo works consistently, the following variables must be present.

| Variable | Required? | Where to set | What it powers |
|---|---|---|---|
| `VITE_SUPABASE_URL` | **Required** | `.env` or Lovable project secrets | Browser Supabase client; points to your Lovable Cloud / Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | **Required** | `.env` or Lovable project secrets | Browser Supabase client; publishable/anon API key for RLS-enabled queries. |
| `SUPABASE_URL` | **Required** | `.env` or Lovable project secrets | Server Supabase client (SSR + server functions); same value as `VITE_SUPABASE_URL`. |
| `SUPABASE_PUBLISHABLE_KEY` | **Required** | `.env` or Lovable project secrets | Server Supabase client when acting as anon/authenticated user; same value as `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Required** | `.env` or Lovable project secrets | Privileged server operations (RLS bypass) such as admin catalog edits and role checks. |
| `LOVABLE_API_KEY` | **Required** | Auto-managed by Lovable | Lovable AI Gateway — chat, STT, TTS. Never expose to the browser. |
| `TWILIO_AUTH_TOKEN` | Required for **phone demo** | Lovable project secrets | Verifies Twilio webhook signatures in `/api/public/twilio/voice`. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY` | Required for **live map** | Lovable project secrets (Google Maps connector) | Browser Google Maps loader key. |
| `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID` | Required for **live map** | Lovable project secrets (Google Maps connector) | Google Maps channel / map ID for the property map. |
| `ADMIN_PASSCODE` | Optional / legacy | Lovable project secrets | Legacy hard-coded admin check; the app now uses role-based auth via `user_roles`. |

```sh
# Minimum set for local development (browser demo + dashboard)
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# AI Gateway is auto-managed on Lovable; include only if running outside Lovable
LOVABLE_API_KEY=lovable_...

# Optional: phone channel
TWILIO_AUTH_TOKEN=...

# Optional: live map on admin and landing pages
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY=...
VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID=...
```

> **Note:** `LOVABLE_API_KEY` is generated automatically by Lovable and should not be edited or
> exposed to the frontend. If you see `Missing LOVABLE_API_KEY` at runtime, the project is likely
> not running on Lovable Cloud or the secret has not been injected.
>
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

## Twilio webhook debug guide

Use this guide when the Twilio phone demo is not behaving. The webhook is at
`/api/public/twilio/voice` on the **published** HTTPS URL only.

### Where to inspect

1. **Twilio Console** → Monitor → Logs → Call Logs → click a call → **Request Inspector** shows the
   exact HTTP request, headers, and response TwiML for every turn.
2. **App logs** → Search for `[twilio]` in the server function logs. The handler logs rejected
   signatures, missing tokens, and AI errors.
3. **Local testing** → If you need to replay a payload manually, capture it from the Twilio
   Request Inspector and POST it with `curl` (signature must be valid or copied from the console).

### Key webhook fields

| Field | Meaning | What we use it for |
|---|---|---|
| `CallSid` | Unique call ID (`CA…`) | We store the conversation state keyed by this ID |
| `From` | Caller phone number (e.g. `+91…`) | Falls back to this as the lead phone if the caller doesn't say one |
| `To` | Your Twilio number | Not used by the agent, but useful for debugging which number was called |
| `SpeechResult` | What Twilio heard the caller say | Sent to the AI for the next turn |
| `Confidence` | Twilio's STT confidence (0–1) | Logged by Twilio; we use the AI STT for our transcript |
| `CallStatus` | `ringing`, `in-progress`, `completed` | We end the call only when the agent decides to close |
| `Direction` | `inbound` / `outbound` | Phone demo is inbound only |

### Example payloads

**Initial call — first `POST` when the caller picks up:**

```text
CallSid=CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
From=%2B919999999999
To=%2B918888888888
CallStatus=ringing
Direction=inbound
```

> At this point `SpeechResult` is absent. The agent greets the caller and returns a `<Gather>` to
> listen for the next answer.

**Mid-call — caller answered a question:**

```text
CallSid=CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
From=%2B919999999999
To=%2B918888888888
SpeechResult=haan+mujhe+Pune+mein+2+BHK+chahiye
Confidence=0.91
CallStatus=in-progress
Direction=inbound
```

> The agent runs `agentTurn` on the accumulated transcript, updates the stored call state, and
> replies with the next TwiML `<Say>` + `<Gather>`.

**No speech / empty result:**

```text
CallSid=CAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
From=%2B919999999999
To=%2B918888888888
SpeechResult=
Confidence=0.00
CallStatus=in-progress
Direction=inbound
```

> If the caller stays silent, the agent will repeat the last question once and then end the call
> politely if there is still no answer.

### Common error checks

| Symptom | Likely cause | Fix |
|---|---|---|
| Webhook returns `503 Webhook not configured` | `TWILIO_AUTH_TOKEN` secret is missing | Add the secret from Twilio Console → Account SID & Auth Token |
| Webhook returns `403 Invalid signature` | URL mismatch or wrong token | Use the **published HTTPS** URL (no trailing slash), method **POST**, and re-copy the Auth Token with no whitespace |
| Twilio debugger shows `11200` (HTTP retrieval failure) | Webhook URL is not public or returned non-XML | Publish the app; the handler must always return valid TwiML XML |
| Call connects but agent never reacts to voice | `SpeechResult` is empty or `<Gather>` not configured | Confirm the webhook URL is set to **POST** and that the Twilio number supports speech input |
| Agent repeats the greeting every turn | `CallSid` is missing or state lookup failed | Check the logs for `[twilio] could not create call`; verify the `external_id` column in the `calls` table |
| Agent replies in wrong language | Polly voice chosen by Devanagari detection | Speak clearly in Hindi/Hinglish for Hindi voices; English for Indian-English voice |
| Call drops after greeting | Handler threw an exception | Check server logs for `[twilio] handler failed`; usually `LOVABLE_API_KEY` missing or DB policy error |
| Lead not created after hangup | Finalize path failed or call status was not `completed` | Check the end-of-call logs; ensure the `leads` table has RLS policies for the service role |

### Quick sanity check

If you have a valid Twilio call and want to test the webhook outside Twilio, copy the real request
body and headers (especially `X-Twilio-Signature`) from the Twilio Request Inspector and replay:

```sh
# Replace with the actual URL and body from the Request Inspector
curl -X POST "https://skylineagentai.lovable.app/api/public/twilio/voice" \
  -H "X-Twilio-Signature: <signature-from-inspector>" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "CallSid=CA...&From=...&SpeechResult=..."
```

> The signature is calculated from the full URL and form parameters, so this replay only works if
> the URL and body match the original Twilio request exactly.

---

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

## Sample Hindi / Hinglish call transcript

Below is a realistic browser-call transcript that shows how the agent qualifies a lead in Hinglish,
extracts the structured fields, and ends the call politely. The same transcript appears in the
**Leads & calls** dashboard after the call ends.

| Speaker | Text |
|---|---|
| **Agent** | Namaste, main Skyline Estates se bol raha hoon. Aap property dekhna chahte hain? Konsi location prefer karoge? |
| **Customer** | Haan, mujhe Pune mein 2 BHK chahiye. Budget around 80 lakh hai. |
| **Agent** | Bahut badhiya. Pune mein humare paas Skyline Greens hai — Wagholi ke pass, NH-48 connectivity achhi hai. Possession agle saal tak hai. Aap investment ya self-use ke liye soch rahe ho? |
| **Customer** | Self-use, family ke liye. Possession jaldi chahiye. |
| **Agent** | Samajh gaya. Skyline Greens mein 2 BHK 78 lakh se start hota hai, RERA registered bhi hai. Aapko site visit schedule karoon? |
| **Customer** | Haan, kar do. Mera naam Rahul Sharma hai, number 98765 43210. |
| **Agent** | Dhanyawaad Rahul ji. Main aapko tomorrow 11 AM ka site-visit slot WhatsApp kar dunga. Kuch aur sawaal ho toh batayein. |
| **Customer** | Theek hai, thank you. |
| **Agent** | Aapka din shubh ho. Bye-bye. |

**Structured fields extracted from this call:**

| Field | Value |
|---|---|
| Name | Rahul Sharma |
| Phone | 98765 43210 |
| Location | Pune |
| Configuration | 2 BHK |
| Budget | ~80 lakh |
| Intent | Self-use |
| Timeline | Immediate / within 12 months |
| Score | **Hot** (high intent, budget+location match, possession urgency) |

You can replay a similar conversation in the browser demo by selecting **Hinglish** or **Hindi**
from the language picker next to **Start call**.

---

## Demo use-cases (5 ready-to-run walkthroughs)

Use these scripts during a demo to show the agent handles different intents, budgets, and cities.
Each row includes the caller profile, a suggested opening line, the key questions the agent is
expected to ask, and the lead the call should produce.

| # | Use case | Opening line | Expected agent questions | Expected output |
|---|---|---|---|---|
| 1 | **Hot buyer — ready to move** | *"Mujhe Pune mein 2 BHK chahiye, budget around 80 lakh, possession agle saal chahiye."* | Location, budget, configuration, possession timeline, self-use vs investment, contact number for site visit. | Location: Pune · Config: 2 BHK · Budget: 80 lakh · Timeline: < 12 months · Intent: self-use · Score: **Hot** |
| 2 | **Investor — rental returns** | *"Mumbai mein 3 BHK investment ke liye dekh raha hoon, budget 2 crore tak."* | Preferred micro-market, expected rental yield, holding period, current location, site-visit slot. | Location: Mumbai · Config: 3 BHK · Budget: 2 crore · Intent: investment · Score: **Hot** |
| 3 | **First-time buyer — tight budget** | *"Bengaluru mein 1 BHK chahiye around 45 lakh, job change ke baad shift karna hai."* | Budget comfort, job area / commute, preferred possession, home-loan assistance, contact for follow-up. | Location: Bengaluru · Config: 1 BHK · Budget: 45 lakh · Timeline: 3–6 months · Intent: self-use · Score: **Warm** |
| 4 | **NRI buyer — family purchase** | *"Delhi NCR mein 4 BHK chahiye family ke liye, budget 3 crore, possession urgent hai."* | City preference (Noida/Gurugram/Delhi), parking needs, security/gated requirement, WhatsApp/phone for overseas coordination. | Location: Delhi NCR · Config: 4 BHK · Budget: 3 crore · Timeline: immediate · Intent: self-use · Score: **Hot** |
| 5 | **Window shopper — low intent** | *"Hyderabad mein property ke rates pata karne hain, abhi final nahi karunga."* | Area of interest, rough budget range, when they plan to decide, why they are browsing, contact to share brochures. | Location: Hyderabad · Config: undecided · Budget: unknown · Timeline: > 12 months · Intent: browsing · Score: **Cold** |

**How to present them:**

1. Open the live app and pick the matching language (Hindi/Hinglish works best for use-cases 1–4).
2. Speak the opening line, then let the agent drive the follow-ups.
3. End the call and open **Leads & calls** to compare the generated score/summary with the table above.
4. Use the CSV export to show the transcript row for the call you just completed.

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
- [ ] Missing `LOVABLE_API_KEY`? The browser demo will show no transcript or no AI replies. This key
      is auto-managed on Lovable Cloud; verify the project is Cloud-enabled and the secret is present.
- [ ] Not sure which env vars are missing? Open the Lovable **Secrets** panel and compare against the
      [Environment variables](#2-environment-variables) table above.
- [ ] `ADMIN_PASSCODE` not working? The app now uses role-based auth; sign up as the first user to
      become admin, then promote others on `/admin`.

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
