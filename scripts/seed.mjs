#!/usr/bin/env node
/**
 * Seed the database with demo calls + leads so the admin dashboard,
 * lead detail panel and CSV exports have realistic data immediately.
 *
 * Usage:
 *   npm run seed            # insert demo rows (skips if already seeded)
 *   npm run seed -- --reset # delete previous demo rows first
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (RLS blocks anonymous
 * inserts on calls/leads by design). Both are read from .env or the shell.
 */
import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const RESET = process.argv.includes("--reset");
const MARKER = "[demo-seed]";

// ---- env ---------------------------------------------------------------
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(`
✗ Cannot seed — missing credentials.

  Needed:
    SUPABASE_URL=${url ? "ok" : "https://<your-project>.supabase.co"}
    SUPABASE_SERVICE_ROLE_KEY=${serviceKey ? "ok" : "<service role key>"}

  Add them to .env in the project root, then re-run:  npm run seed
  (The service role key is required because row-level security blocks
   anonymous inserts into calls/leads.)
`);
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- demo data ---------------------------------------------------------
const t = (role, content) => ({ role, content });
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

const DEMO = [
  {
    channel: "browser",
    language: "hinglish",
    lead: {
      name: "Rohit Sharma",
      phone: "+919812345671",
      intent: "buy",
      location: "Hinjewadi, Pune",
      property_type: "apartment",
      configuration: "2 BHK",
      budget: "85 lakh",
      purpose: "self-use",
      timeline: "this month",
      notes: `${MARKER} Wants a site visit this weekend, loan pre-approved.`,
      status: "qualified",
    },
    transcript: [
      t("assistant", "Namaste! Main Agent bol raha hoon Skyline Greens se. Aap property buy karne ke liye dekh rahe hain?"),
      t("user", "Haan, 2 BHK dekh raha hoon Hinjewadi ke around."),
      t("assistant", "Perfect. Budget range kya rakha hai aap ne?"),
      t("user", "Around 85 lakh tak, self use ke liye hai."),
      t("assistant", "Aur possession kab tak chahiye?"),
      t("user", "This month hi finalise karna hai, loan pre-approved hai."),
      t("assistant", "Bahut badhiya. Site visit is weekend arrange kar dein? Aapka number confirm kar leta hoon."),
      t("user", "Ji, 98123 45671. Saturday morning theek rahega."),
    ],
    summary: [
      "Customer profile: Rohit Sharma, +919812345671, Hinjewadi Pune",
      "Requirement: 2 BHK apartment, Skyline Greens Pune, self-use",
      "Budget: ~85 lakh, home loan pre-approved",
      "Timeline: Closing this month",
      "Language: Hinglish",
      "Sentiment: Very positive, ready to visit",
      "Next action: Site visit Saturday morning, share cost sheet",
    ],
  },
  {
    channel: "phone",
    language: "hindi",
    lead: {
      name: "Anita Verma",
      phone: "+919812345672",
      intent: "invest",
      location: "Thane, Mumbai",
      property_type: "apartment",
      configuration: "1 BHK",
      budget: "1.1 crore",
      purpose: "investment",
      timeline: "2 months",
      notes: `${MARKER} Investor, asked about rental yield and resale trend.`,
      status: "contacted",
    },
    transcript: [
      t("assistant", "Namaste, main Agent bol raha hoon. Aap investment ke liye property dekh rahi hain?"),
      t("user", "Haan, investment ke liye. Thane side me kuch hai?"),
      t("assistant", "Ji bilkul. 1 BHK options hain, rental yield accha milta hai."),
      t("user", "Rental kitna aa sakta hai mahine ka?"),
      t("assistant", "Is location me 1 BHK ka rent lagbhag 22 se 26 hazaar rehta hai."),
      t("user", "Theek hai, budget 1.1 crore tak rakha hai. Do mahine me decide karungi."),
    ],
    summary: [
      "Customer profile: Anita Verma, +919812345672, Thane Mumbai",
      "Requirement: 1 BHK apartment for investment",
      "Budget: Up to 1.1 crore",
      "Timeline: Decision in 2 months",
      "Language: Hindi",
      "Sentiment: Interested, comparing rental yields",
      "Next action: Send rental yield sheet and resale trend data",
    ],
  },
  {
    channel: "browser",
    language: "english",
    lead: {
      name: "Karan Mehta",
      phone: "+919812345673",
      intent: "buy",
      location: "Whitefield, Bengaluru",
      property_type: "apartment",
      configuration: "3 BHK",
      budget: "1.6 crore",
      purpose: "self-use",
      timeline: "next 3 months",
      notes: `${MARKER} NRI buyer, needs virtual tour and NRI payment plan.`,
      status: "new",
    },
    transcript: [
      t("assistant", "Hi, this is Agent from Skyline. Are you looking to buy or rent?"),
      t("user", "Buying. I'm based in Dubai, looking at Whitefield."),
      t("assistant", "Great. What configuration works for your family?"),
      t("user", "3 BHK, budget around 1.6 crore."),
      t("assistant", "Understood. When are you planning to close?"),
      t("user", "In the next three months. Can you share a virtual tour?"),
    ],
    summary: [
      "Customer profile: Karan Mehta, +919812345673, NRI based in Dubai",
      "Requirement: 3 BHK apartment, Whitefield Bengaluru, self-use",
      "Budget: Around 1.6 crore",
      "Timeline: Next 3 months",
      "Language: English",
      "Sentiment: Positive but remote, needs virtual walkthrough",
      "Next action: Share virtual tour link and NRI payment plan",
    ],
  },
  {
    channel: "phone",
    language: "hinglish",
    lead: {
      name: "Sunil Yadav",
      phone: null,
      intent: "buy",
      location: "Noida Extension, Delhi NCR",
      property_type: "apartment",
      configuration: "2 BHK",
      budget: "55 lakh",
      purpose: "self-use",
      timeline: "next year",
      notes: `${MARKER} Budget below project range, follow up when new phase launches.`,
      status: "new",
    },
    transcript: [
      t("assistant", "Namaste, Agent bol raha hoon Skyline se. Ghar dekh rahe hain kya?"),
      t("user", "Haan par budget thoda tight hai, 55 lakh ke andar."),
      t("assistant", "Samajh gaya. Aap kis area me dekh rahe hain?"),
      t("user", "Noida Extension. Agle saal shift karna hai."),
      t("assistant", "Theek hai, new phase launch pe main aapko update kar dunga."),
    ],
    summary: [
      "Customer profile: Sunil Yadav, number not shared, Noida Extension",
      "Requirement: 2 BHK apartment, self-use",
      "Budget: Up to 55 lakh, below current project range",
      "Timeline: Next year",
      "Language: Hinglish",
      "Sentiment: Interested but price sensitive",
      "Next action: Follow up when the affordable phase launches",
    ],
  },
  {
    channel: "browser",
    language: "hinglish",
    lead: {
      name: null,
      phone: null,
      intent: "not_interested",
      location: null,
      property_type: null,
      configuration: null,
      budget: null,
      purpose: null,
      timeline: null,
      notes: `${MARKER} Window shopper, asked not to be called again.`,
      status: "lost",
    },
    transcript: [
      t("assistant", "Namaste, main Agent bol raha hoon Skyline Greens se. Property dekh rahe hain?"),
      t("user", "Nahi bhai, abhi nahi. Mat call kijiye."),
      t("assistant", "Bilkul, aapka time lene ke liye sorry. Have a good day!"),
    ],
    summary: [
      "Customer profile: Not shared",
      "Requirement: Not captured",
      "Budget: Not captured",
      "Timeline: Not captured",
      "Language: Hinglish",
      "Sentiment: Negative, opted out",
      "Next action: Do not call — added to opt-out list",
    ],
  },
];

// deterministic score so seeded rows look like real finalized calls
function scoreLead(lead, transcript) {
  const core = ["intent", "location", "property_type", "configuration", "budget", "purpose", "timeline"];
  const captured = core.filter((f) => lead[f]);
  const reasons = [`${captured.length}/${core.length} requirement fields captured`];
  let score = Math.round((captured.length / core.length) * 35);

  if (lead.phone) { score += 15; reasons.push("Shared a contact number"); }
  else reasons.push("No contact number shared");
  if (lead.name) { score += 5; reasons.push("Shared their name"); }

  const tl = lead.timeline ?? "";
  if (/(this month|immediate|asap|abhi|turant)/i.test(tl)) { score += 20; reasons.push("Timeline is immediate"); }
  else if (/(2 month|3 month|quarter|soon)/i.test(tl)) { score += 12; reasons.push("Timeline within a few months"); }
  else if (/(next year|agle saal)/i.test(tl)) reasons.push("Timeline is a year or more away");
  else if (tl) { score += 6; reasons.push("Timeline captured"); }

  const b = lead.budget ?? "";
  if (/crore|cr\b/i.test(b)) { score += 12; reasons.push("Budget in crores"); }
  else if (/(7[0-9]|[89]\d)\s*(l|lakh)/i.test(b)) { score += 10; reasons.push("Budget matches the project price range"); }
  else if (b) { score += 5; reasons.push("Budget indicated"); }

  const text = transcript.map((x) => x.content).join(" ");
  if (/(site visit|visit kar|book|cost sheet|brochure|virtual tour)/i.test(text)) { score += 10; reasons.push("Asked for a visit or documents"); }
  if (/(mat call|do not call|abhi nahi|not interested)/i.test(text)) { score -= 25; reasons.push("Explicit opt-out signal"); }

  score = Math.max(0, Math.min(100, score));
  const band = score >= 70 ? "hot" : score >= 40 ? "warm" : "cold";
  return { score, band, reasons };
}

// ---- run ---------------------------------------------------------------
async function main() {
  if (RESET) {
    const { data: old } = await db.from("leads").select("id, call_id").like("notes", `${MARKER}%`);
    const leadIds = (old ?? []).map((l) => l.id);
    const callIds = (old ?? []).map((l) => l.call_id).filter(Boolean);
    if (leadIds.length) {
      await db.from("lead_activity").delete().in("lead_id", leadIds);
      await db.from("leads").delete().in("id", leadIds);
    }
    if (callIds.length) await db.from("calls").delete().in("id", callIds);
    console.log(`↺ removed ${leadIds.length} previously seeded lead(s)`);
  } else {
    const { count } = await db.from("leads").select("id", { count: "exact", head: true }).like("notes", `${MARKER}%`);
    if (count && count > 0) {
      console.log(`✓ already seeded (${count} demo leads). Use: npm run seed -- --reset`);
      return;
    }
  }

  let inserted = 0;
  for (const [i, item] of DEMO.entries()) {
    const startedAt = minutesAgo((i + 1) * 47);
    const endedAt = minutesAgo((i + 1) * 47 - 3);
    const s = scoreLead(item.lead, item.transcript);
    const summary = [...item.summary, `Lead score: ${s.score}/100 (${s.band})`].join("\n");

    const { data: call, error: callErr } = await db
      .from("calls")
      .insert({
        channel: item.channel,
        language: item.language,
        transcript: item.transcript,
        summary,
        status: "completed",
        started_at: startedAt,
        ended_at: endedAt,
        draft_lead: item.lead,
      })
      .select("id")
      .single();
    if (callErr) throw callErr;

    const { error: leadErr } = await db.from("leads").insert({
      ...item.lead,
      call_id: call.id,
      score: s.score,
      score_band: s.band,
      score_reasons: s.reasons,
      created_at: startedAt,
    });
    if (leadErr) throw leadErr;

    inserted += 1;
    console.log(`  + ${item.lead.name ?? "Unknown caller"} — ${s.score}/100 (${s.band})`);
  }

  console.log(`\n✓ seeded ${inserted} demo calls + leads`);
  console.log("  Open /leads and /admin, then try the Leads CSV / Transcripts CSV exports.");
}

main().catch((err) => {
  console.error("✗ seed failed:", err.message ?? err);
  process.exit(1);
});
