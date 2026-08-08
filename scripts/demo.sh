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
for arg in "$@"; do
  case "$arg" in
    --tunnel) WANT_TUNNEL=1 ;;
    -h|--help)
      echo "Usage: npm run demo [-- --tunnel]"
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

if [ "$WANT_TUNNEL" -eq 1 ]; then
  cat <<'EOP'
  Phone demo (Twilio):
    1. In another terminal:  npx localtunnel --port 8080     (or: ngrok http 8080)
    2. Copy the public https URL.
    3. Twilio Console → your number → "A call comes in" → Webhook (HTTP POST):
         https://<public-url>/api/public/twilio/voice
    4. Make sure TWILIO_AUTH_TOKEN matches that Twilio account.

EOP
fi

exec $RUN dev
