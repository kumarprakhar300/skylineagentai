# Status review + plan to make this a top-1% product

## What your original assignment asked for — and where it stands

| Requirement | Status |
| --- | --- |
| Hindi / Hinglish / English conversation | Done — auto language detection, Devanagari-aware voices on phone |
| Qualification flow (intent, location, budget, config, purpose, timeline, name, phone) | Done — extracted as structured fields every turn |
| Natural conversation with interruptions | Done — silence detection + barge-in/interrupt in the browser call |
| Project knowledge (dummy project) | Done — Skyline Greens, now database-backed and editable at `/admin` |
| Call summary generation | Done — AI summary at call end, stored with the call |
| Browser demo | Done — real mic → speech-to-text → reasoning → voice reply |
| Phone demo (Twilio) | Done — working voice webhook with TwiML |

Extras already built beyond the brief: leads dashboard with transcript search
and location/budget/date/score filters, automated 0–100 lead scoring with
hot/warm/cold bands, CSV export of leads and transcripts, admin catalog editor,
a docs/how-it-works page.

So the assignment itself is complete. What's missing is everything that turns a
strong demo into a product an interviewer can't fault.

## Gaps I'd fix, in priority order

### 1. Security and privacy (biggest risk right now)
The leads dashboard and the call records behind it are readable by anyone with
the link — real names, phone numbers and full transcripts. A reviewer will
notice. Fix: put `/leads` and `/admin` behind real login (email + Google), move
role checks to a proper roles table, and lock the database so only the signed-in
owner can read call data. Replace the shared admin passcode with account roles.

### 2. Trust and reliability of the call itself
- Retry + graceful fallback when speech-to-text or the model hiccups mid-call,
  instead of dropping the turn.
- A visible "agent is listening / thinking / speaking" state that never gets
  stuck, plus a hard call timeout.
- Rate limiting on the public call and Twilio endpoints so the demo can't be
  abused or run up cost.
- Consent line at call start ("this call is recorded and summarised") — expected
  for anything real-estate/telecom facing in India.

### 3. Follow-through after the call (what a real estate team actually needs)
- Follow-up actions on each lead: mark called back, schedule a site visit,
  add manual notes, change status (new / contacted / visit booked / dropped).
- Automatic WhatsApp-style or email summary of the call to the sales owner.
- Callback scheduling captured during the call and shown on a simple day view.

### 4. Analytics the interviewer will ask about
A small metrics strip and charts: calls per day, average call length,
qualification completion rate, hot/warm/cold split, top requested locations and
budgets, and drop-off point in the flow. This is the difference between "it
works" and "it's a product".

### 5. Polish, performance and findability
- Mobile pass on every page (the call panel especially — that's what gets demoed
  on a phone).
- Loading skeletons and empty states instead of blank panels.
- Accessibility: keyboard operation of the call controls, screen-reader labels,
  visible focus, contrast check in both themes.
- SEO/social: sitemap, real social preview image, per-page metadata audit,
  structured data for the project listing.
- A short "reviewer mode" seeded with 4–5 realistic sample calls so the
  dashboard, scores and charts are never empty when someone opens the link.

### 6. Confidence
Automated tests over the scoring engine, the lead-extraction parsing, and one
end-to-end browser call, so changes can't silently break the demo.

## Suggested build order

1. Auth + database lockdown + admin roles (security first)
2. Lead lifecycle: status, notes, callbacks, follow-up email
3. Analytics dashboard
4. Reliability: retries, timeouts, rate limits, consent line
5. Polish: mobile, a11y, skeletons, SEO, seeded demo data
6. Tests

## Technical notes

- Auth via Lovable Cloud (email + Google); `/leads` and `/admin` move under an
  authenticated route group with a redirect to `/auth`.
- Roles in a separate `user_roles` table with a `has_role` security-definer
  function; row policies rewritten to require an authenticated owner instead of
  public read. `/admin` gates on the `admin` role; the passcode path is removed.
- New columns/tables: `leads.status`, `leads.owner_notes`, `lead_activity`
  (timeline of actions), `callbacks` (scheduled follow-ups).
- Analytics computed in a server function with SQL aggregates, rendered with
  Recharts.
- Rate limiting keyed by IP/CallSid in a small `request_log` table checked inside
  the public handlers.
- Tests with Vitest for scoring/parsing plus one Playwright call flow.

Tell me if you'd rather I start with a specific numbered item; otherwise I'll go
in the order above.
