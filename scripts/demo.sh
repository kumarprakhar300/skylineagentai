#!/usr/bin/env bash
# Skyline Agent — one-command local demo launcher.
#
#   npm run demo            # install (if needed), check env, start dev server
#   npm run demo -- --tunnel  # also print Twilio webhook URL instructions
#
set -euo pipefail

cd "$(dirname "$0")/.."

BOLD='\033[1m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; RED='\033[0;31m'; RESET='\033[0m'
say()  { printf "${BOLD}%s${RESET}\n" "$1"; }
ok()   { printf "  ${GREEN}✓${RESET} %s\n" "$1"; }
warn() { printf "  ${YELLOW}!${RESET} %s\n" "$1"; }
fail() { printf "  ${RED}✗${RESET} %s\n" "$1"; }

WANT_TUNNEL=0
WANT_LOGS=0
for arg in "$@"; do
  case "$arg" in
    --tunnel) WANT_TUNNEL=1 ;;
    --logs) WANT_LOGS=1 ;;
    -h|--help)
      echo "Usage: npm run demo [-- --tunnel] [-- --logs]"
      echo "  --tunnel   start/stop a public tunnel and print the Twilio webhook URL"
      echo "  --logs     capture server, Twilio webhook and transcript/summary logs to a folder"
      exit 0 ;;
  esac
done


# 1. Pick a package manager -----------------------------------------------------
if command -v bun >/dev/null 2>&1; then
  PM=bun; RUN="bun run"; INSTALL="bun install"
else
  PM=npm; RUN="npm run"; INSTALL="npm install"
fi

say "1/5  Package manager"
ok "using $PM"

# 2. Install dependencies if missing -------------------------------------------
say "2/5  Dependencies"
if [ ! -d node_modules ]; then
  warn "node_modules missing — running $INSTALL"
  $INSTALL
  ok "dependencies installed"
else
  ok "node_modules present"
fi

# 3. Environment preflight -----------------------------------------------------
say "3/5  Environment preflight"

ERRORS=()
add_error() { ERRORS+=("$1"); fail "$1"; }

if [ -f .env ]; then
  set +u
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  set -u
  ok ".env loaded"
else
  warn "no .env file found (fine inside Lovable — secrets are injected there)"
  warn "locally: copy the sample block from README → Environment variables into .env"
fi

# --- required: backend connection ---------------------------------------------
if [ -z "${VITE_SUPABASE_URL:-}" ]; then
  add_error "VITE_SUPABASE_URL is missing — required for database, auth and the leads dashboard"
elif ! printf '%s' "$VITE_SUPABASE_URL" | grep -qE '^https://[a-z0-9.-]+'; then
  add_error "VITE_SUPABASE_URL must be a full https:// URL (got: ${VITE_SUPABASE_URL%%:*}...)"
else
  ok "VITE_SUPABASE_URL set"
fi

if [ -z "${VITE_SUPABASE_PUBLISHABLE_KEY:-}" ]; then
  add_error "VITE_SUPABASE_PUBLISHABLE_KEY is missing — required for all backend reads/writes"
elif ! printf '%s' "$VITE_SUPABASE_PUBLISHABLE_KEY" | grep -qE '^(sb_publishable_|eyJ)'; then
  add_error "VITE_SUPABASE_PUBLISHABLE_KEY looks wrong — expected the publishable/anon key (starts with sb_publishable_)"
else
  ok "VITE_SUPABASE_PUBLISHABLE_KEY set"
fi

# --- optional / channel-specific ----------------------------------------------
if [ -z "${LOVABLE_API_KEY:-}" ]; then
  warn "LOVABLE_API_KEY not set — no AI replies, transcript or voice locally (auto-injected on Lovable)"
else
  ok "LOVABLE_API_KEY set"
fi

if [ -z "${TWILIO_AUTH_TOKEN:-}" ]; then
  if [ "$WANT_TUNNEL" -eq 1 ]; then
    add_error "TWILIO_AUTH_TOKEN is missing but --tunnel was requested — the webhook rejects every call without it"
  else
    warn "TWILIO_AUTH_TOKEN not set — phone demo disabled, browser demo unaffected"
  fi
else
  ok "TWILIO_AUTH_TOKEN set"
fi

if [ -z "${VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY:-}" ]; then
  warn "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY not set — the live property map will not render"
else
  ok "VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY set"
fi

if [ "${#ERRORS[@]}" -gt 0 ]; then
  echo
  fail "Preflight failed — ${#ERRORS[@]} problem(s) must be fixed before the demo can start:"
  for e in "${ERRORS[@]}"; do printf "     • %s\n" "$e"; done
  cat <<EOP

  How to fix
    1. Open (or create) .env in the project root.
    2. Add the missing values — see README → "Environment variables" for the full table
       and a copy-paste sample block:

         VITE_SUPABASE_URL=https://<your-project>.supabase.co
         VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
         LOVABLE_API_KEY=...            # optional locally, needed for AI voice
         TWILIO_AUTH_TOKEN=...          # only for the phone demo / --tunnel

    3. Re-run:  $RUN demo$([ "$WANT_TUNNEL" -eq 1 ] && echo " -- --tunnel")

  Running inside Lovable? The backend keys are injected automatically — run the demo there,
  or skip --tunnel to start the browser-only demo.
EOP
  exit 1
fi
ok "all required variables present"

# 4. Port availability ---------------------------------------------------------
PORT="${PORT:-8080}"
say "4/5  Port $PORT"
if curl -sf -o /dev/null "http://localhost:$PORT/" 2>/dev/null; then
  warn "something is already serving http://localhost:$PORT"
  warn "stop it, or start on another port:  PORT=3000 $RUN demo"
else
  ok "port $PORT is free"
fi


# 4. Start dev server ---------------------------------------------------------
say "5/5  Starting dev server"
cat <<'EOP'

  Demo checklist
    •  /            landing page + browser voice demo (pick language, Start call)
    •  /leads       captured leads, transcripts, CSV export
    •  /analytics   pipeline + score analytics
    •  /admin       project catalog editor, role management, CSV export

EOP

PORT="${PORT:-8080}"
DEV_PID=""
TUNNEL_PID=""
SPLIT_PIDS=()
LOG_DIR=""
TUNNEL_LOG="$(mktemp -t skyline-tunnel.XXXXXX)"

# --logs: timestamped run folder with split log streams -------------------------
if [ "$WANT_LOGS" -eq 1 ]; then
  LOG_DIR="demo-logs/$(date +%Y-%m-%d_%H-%M-%S)"
  mkdir -p "$LOG_DIR"
  {
    echo "Skyline Agent demo run"
    echo "started:        $(date -u '+%Y-%m-%dT%H:%M:%SZ') (UTC)"
    echo "package manager: $PM"
    echo "port:           $PORT"
    echo "tunnel:         $([ "$WANT_TUNNEL" -eq 1 ] && echo enabled || echo disabled)"
  } >"$LOG_DIR/run-info.txt"
  say "Log capture"
  ok "writing logs to $LOG_DIR/"
  echo "     server.log      all dev-server / server-function output"
  echo "     twilio.log      Twilio webhook hits (/api/public/twilio/*)"
  echo "     agent.log       transcript, STT/TTS and call-summary output"
  echo "     tunnel.log      tunnel process output (with --tunnel)"
  echo "     run-info.txt    run metadata + exit summary"
  echo
fi

cleanup() {
  trap - EXIT INT TERM
  if [ -n "$TUNNEL_PID" ] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    printf "\n"; say "Stopping tunnel"
    kill "$TUNNEL_PID" 2>/dev/null || true
    wait "$TUNNEL_PID" 2>/dev/null || true
    ok "tunnel closed"
  fi
  if [ -n "$DEV_PID" ] && kill -0 "$DEV_PID" 2>/dev/null; then
    kill "$DEV_PID" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
  fi
  if [ -n "$LOG_DIR" ]; then
    for p in "${SPLIT_PIDS[@]:-}"; do
      [ -n "$p" ] && kill "$p" 2>/dev/null || true
    done
    [ -s "$TUNNEL_LOG" ] && cp "$TUNNEL_LOG" "$LOG_DIR/tunnel.log" 2>/dev/null || true
    {
      echo "stopped:        $(date -u '+%Y-%m-%dT%H:%M:%SZ') (UTC)"
      echo "twilio hits:    $(wc -l <"$LOG_DIR/twilio.log" 2>/dev/null | tr -d ' ' || echo 0) lines"
      echo "agent lines:    $(wc -l <"$LOG_DIR/agent.log" 2>/dev/null | tr -d ' ' || echo 0) lines"
    } >>"$LOG_DIR/run-info.txt"
    printf "\n"; say "Logs saved"
    ok "$LOG_DIR/"
  fi
  rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT INT TERM

start_dev() {
  if [ -z "$LOG_DIR" ]; then
    $RUN dev &
    DEV_PID=$!
    return
  fi
  : >"$LOG_DIR/server.log"; : >"$LOG_DIR/twilio.log"; : >"$LOG_DIR/agent.log"
  $RUN dev > >(tee -a "$LOG_DIR/server.log") 2>&1 &
  DEV_PID=$!
  tail -n0 -F "$LOG_DIR/server.log" 2>/dev/null \
    | grep --line-buffered -iE 'twilio|/api/public/twilio|CallSid|Gather|SpeechResult' \
    >>"$LOG_DIR/twilio.log" &
  SPLIT_PIDS+=($!)
  tail -n0 -F "$LOG_DIR/server.log" 2>/dev/null \
    | grep --line-buffered -iE 'transcript|summary|lead score|/api/(stt|tts|turn|end-call)|agentTurn' \
    >>"$LOG_DIR/agent.log" &
  SPLIT_PIDS+=($!)
}

if [ "$WANT_TUNNEL" -eq 0 ]; then
  if [ -z "$LOG_DIR" ]; then
    exec $RUN dev
  fi
  start_dev
  wait "$DEV_PID"
  exit 0
fi

# --tunnel: run the dev server in the background, then bring up the public tunnel.
start_dev


printf "  waiting for http://localhost:%s " "$PORT"
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://localhost:$PORT/"; then break; fi
  printf "."
  sleep 1
done
printf "\n"
if ! curl -sf -o /dev/null "http://localhost:$PORT/"; then
  fail "dev server did not start on port $PORT"
  exit 1
fi
ok "dev server ready"

say "Starting Twilio tunnel"
PUBLIC_URL=""

if command -v ngrok >/dev/null 2>&1; then
  ok "using ngrok"
  ngrok http "$PORT" --log stdout >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
  for _ in $(seq 1 40); do
    PUBLIC_URL=$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null \
      | grep -Eo 'https://[a-zA-Z0-9.-]+\.ngrok[a-zA-Z0-9.-]*' | head -n1 || true)
    [ -n "$PUBLIC_URL" ] && break
    sleep 1
  done
else
  ok "ngrok not found — using npx localtunnel"
  npx --yes localtunnel --port "$PORT" >"$TUNNEL_LOG" 2>&1 &
  TUNNEL_PID=$!
  for _ in $(seq 1 60); do
    PUBLIC_URL=$(grep -Eo 'https://[a-zA-Z0-9.-]+\.loca\.lt' "$TUNNEL_LOG" | head -n1 || true)
    [ -n "$PUBLIC_URL" ] && break
    sleep 1
  done
fi

if [ -z "$PUBLIC_URL" ]; then
  fail "could not obtain a public tunnel URL — see $TUNNEL_LOG"
  warn "start one manually:  ngrok http $PORT   (or: npx localtunnel --port $PORT)"
else
  echo
  say "Twilio webhook"
  ok "public base URL:  $PUBLIC_URL"
  printf "  ${BOLD}webhook (HTTP POST):${RESET} %s/api/public/twilio/voice\n" "$PUBLIC_URL"
  echo
  cat <<EOP
    1. Twilio Console → Phone Numbers → your number → Voice
    2. "A call comes in" → Webhook, HTTP POST →
         $PUBLIC_URL/api/public/twilio/voice
    3. Make sure TWILIO_AUTH_TOKEN matches that Twilio account.

  Ctrl+C stops both the dev server and the tunnel.

EOP
fi

wait "$DEV_PID"

