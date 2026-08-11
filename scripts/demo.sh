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

say "1/4  Package manager"
ok "using $PM"

# 2. Install dependencies if missing -------------------------------------------
say "2/4  Dependencies"
if [ ! -d node_modules ]; then
  warn "node_modules missing — running $INSTALL"
  $INSTALL
  ok "dependencies installed"
else
  ok "node_modules present"
fi

# 3. Environment check ---------------------------------------------------------
say "3/4  Environment"
if [ -f .env ]; then
  set +u
  # shellcheck disable=SC1091
  set -a; . ./.env; set +a
  set -u
  ok ".env loaded"
else
  warn "no .env file found (fine when running inside Lovable — secrets are injected)"
fi

REQUIRED=(VITE_SUPABASE_URL VITE_SUPABASE_PUBLISHABLE_KEY)
OPTIONAL=(LOVABLE_API_KEY TWILIO_AUTH_TOKEN VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY)

MISSING=0
for v in "${REQUIRED[@]}"; do
  if [ -z "${!v:-}" ]; then fail "$v is missing (required)"; MISSING=1; else ok "$v set"; fi
done

for v in "${OPTIONAL[@]}"; do
  if [ -z "${!v:-}" ]; then
    case "$v" in
      LOVABLE_API_KEY) warn "LOVABLE_API_KEY not set locally — voice/AI works only when running on Lovable" ;;
      TWILIO_AUTH_TOKEN) warn "TWILIO_AUTH_TOKEN not set — phone demo disabled, browser demo unaffected" ;;
      *) warn "$v not set — live property map will not render" ;;
    esac
  else
    ok "$v set"
  fi
done

if [ "$MISSING" -eq 1 ]; then
  echo
  fail "Fill the required variables (see README → Environment variables) and re-run: $RUN demo"
  exit 1
fi

# 4. Start dev server ---------------------------------------------------------
say "4/4  Starting dev server"
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

