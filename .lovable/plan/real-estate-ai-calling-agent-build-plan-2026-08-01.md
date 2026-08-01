# Real Estate AI Calling Agent — Build Plan

A live web app where an AI sales executive talks to a prospect in Hindi, Hinglish, or English, qualifies their property requirement, captures the lead, and produces a call summary. Plus a phone-call path via Twilio for the outbound demo.

## Sample project (invented, clearly marked as dummy)

**Skyline Greens, Wakad, Pune**
- Configurations: 2 BHK (720 sq ft), 3 BHK (1,050 sq ft), 4 BHK (1,480 sq ft)
- Indicative price: 78 lakh – 2.1 crore (subject to change, no commitments)
- Amenities: clubhouse, rooftop infinity pool, gym, kids' play zone, jogging track, EV charging, 3-tier security
- Possession: December 2027 (RERA-registered demo placeholder)
- Location advantages: 10 min to Hinjewadi IT Park, 5 min to Mumbai–Pune Expressway, schools and hospitals within 3 km

Editable from one file so the flow can be modified live during the interview.

## What the app has

1. **Landing / demo page** — project brief, "which parts are functional vs simulated" panel, and a Start Call button.
2. **Browser voice call (fully functional)**
   - Mic capture -> speech-to-text (Hindi/Hinglish/English auto-detect)
   - AI agent replies in the customer's language, with the sales-executive persona and project knowledge
   - Reply spoken back with text-to-speech; live transcript shown alongside
   - Barge-in: user can start talking to interrupt playback
   - Push-to-talk fallback if mic auto-detection misbehaves
3. **Qualification engine** — the agent extracts, turn by turn: intent (buy/invest), location, property type, configuration, budget, purpose, timeline, name and phone. A visible checklist shows what is still missing so the interviewer can watch requirements change live.
4. **End call -> summary** — AI generates a short call summary plus structured lead fields; saved to the database.
5. **Leads dashboard** — table of all calls with requirements, summary, language used, and full transcript. This is the "where is lead data stored" answer.
6. **Phone calling (Twilio)** — a call-out form that dials a number and runs the same agent over the phone. Needs your Twilio account with a voice-enabled number; until connected, the UI shows a clear "not configured" state and the browser demo stays the primary path.

## Guardrails

System prompt forbids guaranteed returns, false commitments, and invented inventory; prices always framed as indicative. Agent stays on real estate topics and deflects politely otherwise.

## Technical notes

- TanStack Start + React, Tailwind. Lovable Cloud (Postgres) for leads.
- Lovable AI Gateway for everything AI: `google/gemini-3.6-flash` for conversation, `openai/gpt-4o-mini-transcribe` for speech-to-text, `openai/gpt-4o-mini-tts` for speech. Keys stay server-side.
- Server functions: `transcribe`, `agentReply`, `speak`, `saveLead`, `summarizeCall`. Public server route `/api/public/twilio/voice` for the Twilio webhook (signature-verified).
- Tables: `calls` (language, transcript JSON, summary, status) and `leads` (name, phone, intent, location, property type, configuration, budget, purpose, timeline, call ref). RLS with explicit grants; demo dashboard readable so it can be shown live without login.
- Project knowledge and conversation stages live in `src/lib/agent/project.ts` and `prompt.ts` — small, single-file edits for the "modify the flow live" ask.

## Sequence

1. Enable Lovable Cloud, create `calls` and `leads` tables.
2. Build agent knowledge + prompt module.
3. Server functions for STT, chat, TTS, lead save, summary.
4. Voice call UI with live transcript and requirement checklist.
5. Summary screen + leads dashboard.
6. Twilio phone path (needs your Twilio credentials).
7. SEO metadata, README-style docs page listing tools, model, flow design, challenges, limitations — ready to paste into your submission form.

## Out of scope

Video recording and the GitHub link are yours to produce; the app and its docs page will give you everything to record and describe.
