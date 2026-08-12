#!/usr/bin/env node
/**
 * Verify the demo seed before a live walkthrough.
 *
 * Runs three passes and fails fast with an exact remedy:
 *   1. Schema  — every column the app reads exists on calls / leads / lead_activity.
 *   2. Counts  — the expected number of seeded leads, calls and transcript turns.
 *   3. Content — each seeded lead links to a call with a transcript, a sectioned
 *                summary and a valid score band, so /leads, /admin and the CSV
 *                exports all have something to show.
 *
 * Usage:
 *   npm run seed:verify                # expects 5 demo leads (the seed default)
 *   npm run seed:verify -- --expect 5  # override the expected lead count
 *   npm run seed:verify -- --all       # also count non-demo (real) calls
 *
 * Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (row-level security hides
 * calls/leads from anonymous readers). Both are read from .env or the shell.
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const MARKER = "[demo-seed]";
const argv = process.argv.slice(2);
const INCLUDE_ALL = argv.includes("--all");
const expectIndex = argv.indexOf("--expect");
const EXPECTED_LEADS =
  expectIndex >= 0 && argv[expectIndex + 1] ? Number(argv[expectIndex + 1]) : 5;

if (!Number.isFinite(EXPECTED_LEADS) || EXPECTED_LEADS < 1) {
  console.error("✗ --expect needs a positive number, e.g. --expect 5");
  process.exit(1);
}

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
✗ Cannot verify — missing credentials.

  Needed in .env (project root):
    SUPABASE_URL=${url ? "ok" : "https://<your-project>.supabase.co"}
    SUPABASE_SERVICE_ROLE_KEY=${serviceKey ? "ok" : "<service role key>"}

  Row-level security hides calls/leads from anonymous readers, so the
  service role key is required for this check.
`);
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ---- expected schema ---------------------------------------------------
const SCHEMA = {
  calls: [
    "id",
    "channel",
    "language",
    "transcript",
    "summary",
    "status",
    "started_at",
    "ended_at",
    "draft_lead",
  ],
  leads: [
    "id",
    "call_id",
    "name",
    "phone",
    "intent",
    "location",
    "property_type",
    "configuration",
    "budget",
    "purpose",
    "timeline",
    "notes",
    "score",
    "score_band",
    "score_reasons",
    "status",
    "owner_notes",
    "callback_at",
    "created_at",
  ],
  lead_activity: ["id", "lead_id", "actor_id", "kind", "detail", "created_at"],
  project_catalog: ["id", "city", "name", "configurations", "amenities", "benefits"],
};

const SUMMARY_LABELS = [
  "Customer profile",
  "Requirement",
  "Budget",
  "Timeline",
  "Language",
  "Sentiment",
  "Next action",
  "Lead score",
];

const failures = [];
const warnings = [];
const fail = (what, fix) => failures.push({ what, fix });
const ok = (line) => console.log(`  ✓ ${line}`);

// ---- 1. schema ---------------------------------------------------------
async function checkSchema() {
  console.log("\n1/3  Schema");
  for (const [table, columns] of Object.entries(SCHEMA)) {
    const res = await db.from(table).select(columns.join(", ")).limit(1);
    if (res.error) {
      fail(
        `table "${table}" is not usable — ${res.error.message}`,
        res.error.message.includes("does not exist")
          ? "A migration is missing. Re-open the project in Lovable and re-apply the database migrations."
          : "Check the table's grants and row-level security policies.",
      );
      console.log(`  ✗ ${table}`);
      continue;
    }
    ok(`${table} — all ${columns.length} expected columns present`);
  }
}

// ---- 2. counts ---------------------------------------------------------
async function checkCounts() {
  console.log("\n2/3  Row counts");

  const demoLeads = await db
    .from("leads")
    .select("id, call_id, name, score, score_band, score_reasons, status, notes")
    .like("notes", `${MARKER}%`)
    .order("created_at", { ascending: false });
  if (demoLeads.error) {
    fail(`could not read leads — ${demoLeads.error.message}`, "Check the service role key.");
    return { leads: [], calls: [] };
  }

  const leads = demoLeads.data ?? [];
  if (leads.length === 0) {
    fail(
      "no seeded demo leads found",
      "Run:  npm run seed        (or  npm run seed:reset  to start clean)",
    );
  } else if (leads.length !== EXPECTED_LEADS) {
    fail(
      `expected ${EXPECTED_LEADS} demo leads but found ${leads.length}`,
      leads.length < EXPECTED_LEADS
        ? "The seed ran partially. Run:  npm run seed:reset"
        : "The seed ran more than once. Run:  npm run seed:reset",
    );
  } else {
    ok(`${leads.length} demo leads (expected ${EXPECTED_LEADS})`);
  }

  const callIds = leads.map((l) => l.call_id).filter(Boolean);
  let calls = [];
  if (callIds.length > 0) {
    const res = await db
      .from("calls")
      .select("id, channel, language, summary, transcript, started_at, ended_at")
      .in("id", callIds);
    if (res.error) {
      fail(`could not read calls — ${res.error.message}`, "Check the service role key.");
    } else {
      calls = res.data ?? [];
    }
  }

  if (leads.length > 0 && calls.length !== callIds.length) {
    fail(
      `${leads.length} demo leads but only ${calls.length} linked calls`,
      "Transcript views need the call row. Run:  npm run seed:reset",
    );
  } else if (calls.length > 0) {
    ok(`${calls.length} linked calls`);
  }

  const turns = calls.reduce(
    (sum, call) => sum + (Array.isArray(call.transcript) ? call.transcript.length : 0),
    0,
  );
  if (calls.length > 0 && turns === 0) {
    fail("linked calls contain no transcript turns", "Run:  npm run seed:reset");
  } else if (turns > 0) {
    ok(`${turns} transcript turns across ${calls.length} calls (avg ${Math.round(turns / calls.length)}/call)`);
  }

  if (INCLUDE_ALL) {
    const total = await db.from("calls").select("id", { count: "exact", head: true });
    const realCalls = (total.count ?? 0) - calls.length;
    ok(`${realCalls} non-demo call(s) also present`);
  }

  return { leads, calls };
}

// ---- 3. content --------------------------------------------------------
async function checkContent(leads, calls) {
  console.log("\n3/3  Content readiness");
  if (leads.length === 0) return;

  const byId = new Map(calls.map((c) => [c.id, c]));
  const bands = new Set(["hot", "warm", "cold"]);
  let scored = 0;
  let sectioned = 0;

  for (const lead of leads) {
    const label = lead.name || lead.id.slice(0, 8);
    const call = lead.call_id ? byId.get(lead.call_id) : null;

    if (!call) {
      fail(`lead "${label}" has no linked call`, "Run:  npm run seed:reset");
      continue;
    }
    if (!Array.isArray(call.transcript) || call.transcript.length === 0) {
      fail(`lead "${label}" has an empty transcript`, "Run:  npm run seed:reset");
    }
    if (!call.ended_at) {
      warnings.push(`lead "${label}" has no call end time — transcript timestamps will read 0:00`);
    }

    const summary = typeof call.summary === "string" ? call.summary : "";
    const present = SUMMARY_LABELS.filter((l) =>
      new RegExp(`^${l}:`, "im").test(summary),
    ).length;
    if (present === 0) {
      fail(
        `lead "${label}" has no sectioned summary`,
        "The summary sections drive the lead panel and CSV columns. Run:  npm run seed:reset",
      );
    } else {
      if (present < SUMMARY_LABELS.length) {
        warnings.push(
          `lead "${label}" summary has ${present}/${SUMMARY_LABELS.length} sections filled`,
        );
      }
      sectioned += 1;
    }

    if (typeof lead.score !== "number" || !bands.has(String(lead.score_band))) {
      fail(
        `lead "${label}" is not scored (score=${lead.score}, band=${lead.score_band})`,
        "Score badges and band filters need this. Run:  npm run seed:reset",
      );
    } else {
      scored += 1;
      if (!Array.isArray(lead.score_reasons) || lead.score_reasons.length === 0) {
        warnings.push(`lead "${label}" has a score but no score signals`);
      }
    }
  }

  if (scored === leads.length) ok(`${scored}/${leads.length} leads scored with a valid band`);
  if (sectioned === leads.length) ok(`${sectioned}/${leads.length} calls have a sectioned summary`);

  const bandsSeen = new Set(leads.map((l) => l.score_band).filter(Boolean));
  if (bandsSeen.size < 2) {
    warnings.push(
      `all demo leads share the band "${[...bandsSeen][0] ?? "none"}" — the band filter demo will look flat`,
    );
  } else {
    ok(`score bands present: ${[...bandsSeen].sort().join(", ")}`);
  }
}

// ---- run ---------------------------------------------------------------
async function main() {
  console.log(`Seed validation — expecting ${EXPECTED_LEADS} demo leads tagged "${MARKER}"`);
  await checkSchema();
  const { leads, calls } = await checkCounts();
  await checkContent(leads, calls);

  if (warnings.length > 0) {
    console.log("\n⚠ Warnings (safe to demo, but worth knowing)");
    warnings.forEach((w) => console.log(`  · ${w}`));
  }

  if (failures.length > 0) {
    console.error(`\n✗ ${failures.length} problem(s) found — do not start the demo yet:\n`);
    failures.forEach(({ what, fix }, i) => {
      console.error(`  ${i + 1}. ${what}`);
      console.error(`     → ${fix}\n`);
    });
    process.exit(1);
  }

  console.log("\n✓ Database is demo-ready.");
  console.log("  Next:  npm run demo   then open /leads and /admin");
}

main().catch((err) => {
  console.error("✗ verification failed:", err?.message ?? err);
  process.exit(1);
});
