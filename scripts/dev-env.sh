#!/usr/bin/env bash
# =============================================================================
# scripts/dev-env.sh
#
# One-command local development environment for n8n-nodes-binalyze-air.
# Builds the package, links it into a local n8n instance, and starts n8n
# via npx so contributors can iterate without a global n8n install.
#
# Usage:
#   ./scripts/dev-env.sh up        Build, link, start n8n (downloads via npx on first run)
#   ./scripts/dev-env.sh down      Stop the n8n instance started by this script
#   ./scripts/dev-env.sh status    Show whether n8n is running
#   ./scripts/dev-env.sh logs      Tail the n8n log
#   ./scripts/dev-env.sh -h        Show this help
#
# Single responsibility: this script only manages the n8n process and the
# package link. Manual security/redirect testing is documented separately in
# README "Security Testing" — see test/mock-redirect-servers.js.
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# n8n reads N8N_USER_FOLDER and appends "/.n8n" internally, so this is the *parent*.
N8N_USER_FOLDER="${HOME}/.n8n"
NODES_DIR="${HOME}/.n8n/.n8n/nodes"

N8N_LOG="/tmp/n8n-nodes-binalyze-air-dev.log"
N8N_PID_FILE="/tmp/n8n-nodes-binalyze-air-dev.pid"
N8N_PORT=5678

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; DIM='\033[2m'; RESET='\033[0m'

info() { echo -e "${CYAN}[INFO]${RESET} $1"; }
ok()   { echo -e "${GREEN}[OK]${RESET}   $1"; }
warn() { echo -e "${YELLOW}[WARN]${RESET} $1"; }
err()  { echo -e "${RED}[ERR]${RESET}  $1" >&2; }

usage() {
	cat <<'EOF'
dev-env.sh — local n8n development environment

Usage:
  ./scripts/dev-env.sh up        Build, link, start n8n
  ./scripts/dev-env.sh down      Stop the n8n instance started by this script
  ./scripts/dev-env.sh status    Show whether n8n is running
  ./scripts/dev-env.sh logs      Tail the n8n log
  ./scripts/dev-env.sh -h        Show this help

After "up":
  n8n editor: http://localhost:5678

  Iterate by editing source, then either:
    - re-run "./scripts/dev-env.sh up" (rebuilds & relinks; n8n restart needed
      only when changes are not picked up automatically), or
    - use "yarn dev" for watch-mode rebuilds against a separately running n8n.
EOF
}

is_pid_alive() {
	[ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

wait_for_port() {
	local port="$1" timeout="$2"
	while ! lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
		timeout=$((timeout - 2))
		if [ "$timeout" -le 0 ]; then return 1; fi
		sleep 2
	done
}

build_package() {
	info "building package in $REPO_ROOT ..."
	(cd "$REPO_ROOT" && npm run build >/dev/null)
	ok "build complete (dist/ ready)"
}

link_package() {
	info "linking package into $NODES_DIR ..."
	mkdir -p "$NODES_DIR"
	(
		cd "$NODES_DIR"
		[ -f package.json ] || npm init -y >/dev/null
		npm install "$REPO_ROOT" >/dev/null 2>&1
	)
	ok "package linked"
}

start_n8n() {
	if is_pid_alive "$N8N_PID_FILE"; then
		warn "n8n already running (pid $(cat "$N8N_PID_FILE"))"
		return 0
	fi
	info "starting n8n on port $N8N_PORT (first run downloads via npx) ..."
	(
		cd "$HOME"
		N8N_USER_FOLDER="$N8N_USER_FOLDER" \
			npx --yes n8n start > "$N8N_LOG" 2>&1 &
		echo $! > "$N8N_PID_FILE"
	)
	echo -e "  ${DIM}waiting for n8n to listen on :$N8N_PORT (up to 3 min) ...${RESET}"
	if wait_for_port "$N8N_PORT" 180; then
		ok "n8n pid $(cat "$N8N_PID_FILE"), log $N8N_LOG"
	else
		err "n8n did not come up in time — see $N8N_LOG"
		return 1
	fi
}

cmd_up() {
	build_package
	link_package
	start_n8n
	echo
	echo -e "${GREEN}Environment ready.${RESET}"
	echo "  n8n editor: http://localhost:5678"
	echo "  Stop with:  $0 down"
}

cmd_down() {
	if [ -f "$N8N_PID_FILE" ]; then
		local pid; pid=$(cat "$N8N_PID_FILE")
		if kill -0 "$pid" 2>/dev/null; then
			kill "$pid" 2>/dev/null || true
			ok "stopped n8n (pid $pid)"
		fi
		rm -f "$N8N_PID_FILE"
	fi
	# extra safety: kill any orphan npx-spawned n8n
	pkill -f "npx.*n8n start" 2>/dev/null || true
}

cmd_status() {
	if lsof -nP -iTCP:"$N8N_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
		local pid; pid=$(lsof -nP -iTCP:"$N8N_PORT" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $2}')
		echo -e "  ${GREEN}●${RESET} n8n  port $N8N_PORT  pid $pid"
	else
		echo -e "  ${RED}○${RESET} n8n  port $N8N_PORT  not running"
	fi
	echo
	echo "  log: $N8N_LOG"
}

cmd_logs() {
	if [ ! -f "$N8N_LOG" ]; then
		err "$N8N_LOG not found — run '$0 up' first"
		exit 1
	fi
	tail -f "$N8N_LOG"
}

case "${1:-}" in
	up)     cmd_up ;;
	down)   cmd_down ;;
	status) cmd_status ;;
	logs)   cmd_logs ;;
	-h|--help|help|"") usage ;;
	*) err "unknown command: $1"; usage; exit 1 ;;
esac
