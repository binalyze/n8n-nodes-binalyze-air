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
# package link. It does not modify n8n's default config layout — n8n keeps
# using ~/.n8n the same way it would for any other contributor workflow.
# =============================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Use n8n's standard layout (~/.n8n) — matches the other dev scripts in this
# repo (e.g. scripts/dev-link.sh) and how n8n behaves with no env overrides.
NODES_DIR="${HOME}/.n8n/nodes"

N8N_LOG="/tmp/n8n-nodes-binalyze-air-dev.log"
N8N_PID_FILE="/tmp/n8n-nodes-binalyze-air-dev.pid"
BUILD_LOG="/tmp/n8n-nodes-binalyze-air-dev-build.log"
INSTALL_LOG="/tmp/n8n-nodes-binalyze-air-dev-install.log"
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

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

require_cmd() {
	command -v "$1" >/dev/null 2>&1 || {
		err "required command not found on PATH: $1"
		[ -n "${2:-}" ] && echo "       $2" >&2
		exit 1
	}
}

is_pid_alive() {
	[ -f "$1" ] && kill -0 "$(cat "$1")" 2>/dev/null
}

port_is_listening() {
	lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

pid_on_port() {
	lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | awk 'NR==2 {print $2}'
}

# Wait until the script-managed n8n PID has *itself or a descendant* bound to
# the port. This avoids false positives from an unrelated listener (e.g. a
# yarn-dev n8n that was already running on 5678).
wait_for_managed_port() {
	local port="$1" timeout="$2" managed_pid="$3"
	while :; do
		# Our managed process must still be alive.
		if ! kill -0 "$managed_pid" 2>/dev/null; then return 1; fi
		# If the port is bound, ensure it's bound by our process tree.
		if port_is_listening "$port"; then
			local listener_pid
			listener_pid=$(pid_on_port "$port")
			if pid_in_subtree "$managed_pid" "$listener_pid"; then
				return 0
			fi
			err "port $port is held by pid $listener_pid (outside this script's process tree)"
			return 2
		fi
		timeout=$((timeout - 2))
		if [ "$timeout" -le 0 ]; then return 1; fi
		sleep 2
	done
}

# Returns 0 if $2 is $1 or a descendant of $1.
pid_in_subtree() {
	local root="$1" target="$2" cur="$2"
	while [ -n "$cur" ] && [ "$cur" != "1" ] && [ "$cur" != "0" ]; do
		if [ "$cur" = "$root" ]; then return 0; fi
		cur=$(ps -o ppid= -p "$cur" 2>/dev/null | tr -d ' ')
		[ -z "$cur" ] && return 1
	done
	return 1
}

run_or_show_log() {
	# Run a command, capture combined output. On failure, print the captured
	# output to stderr and return non-zero. On success, delete the log.
	local logfile="$1"; shift
	if "$@" >"$logfile" 2>&1; then
		rm -f "$logfile"
		return 0
	else
		local rc=$?
		err "command failed (exit $rc): $*"
		echo "----- captured output ($logfile) -----" >&2
		cat "$logfile" >&2
		echo "----- end -----" >&2
		return "$rc"
	fi
}

# ---------------------------------------------------------------------------
# Steps
# ---------------------------------------------------------------------------

build_package() {
	info "building package in $REPO_ROOT ..."
	( cd "$REPO_ROOT" && run_or_show_log "$BUILD_LOG" npm run build )
	ok "build complete (dist/ ready)"
}

link_package() {
	info "linking package into $NODES_DIR ..."
	mkdir -p "$NODES_DIR"
	(
		cd "$NODES_DIR"
		if [ ! -f package.json ]; then
			run_or_show_log "$INSTALL_LOG" npm init -y
		fi
		run_or_show_log "$INSTALL_LOG" npm install "$REPO_ROOT"
	)
	ok "package linked"
}

start_n8n() {
	if is_pid_alive "$N8N_PID_FILE"; then
		warn "n8n already running under this script (pid $(cat "$N8N_PID_FILE"))"
		return 0
	fi

	# Refuse to start if the port is already taken by something else — otherwise
	# we'd report "up" while another listener actually serves traffic.
	if port_is_listening "$N8N_PORT"; then
		err "port $N8N_PORT is already in use (pid $(pid_on_port "$N8N_PORT"))."
		echo "       Free it or stop the other n8n (e.g. 'yarn dev') before running '$0 up'." >&2
		return 1
	fi

	info "starting n8n on port $N8N_PORT (first run downloads via npx) ..."
	# Start n8n in the background. We need the recorded PID to be the actual
	# parent of the n8n process tree (not a transient subshell), otherwise once
	# the subshell exits npx is reparented to init and our subtree check fails.
	# "exec" inside the subshell replaces the subshell with npx so the recorded
	# PID *is* npx itself and stays the root of the subtree we manage.
	( cd "$HOME" && exec npx --yes n8n start > "$N8N_LOG" 2>&1 ) &
	echo $! > "$N8N_PID_FILE"

	local managed_pid; managed_pid=$(cat "$N8N_PID_FILE")
	echo -e "  ${DIM}waiting for n8n to listen on :$N8N_PORT (up to 3 min) ...${RESET}"
	case $(wait_for_managed_port "$N8N_PORT" 180 "$managed_pid"; echo $?) in
		0) ok "n8n pid $managed_pid, log $N8N_LOG" ;;
		2) rm -f "$N8N_PID_FILE"; return 1 ;;
		*) err "n8n did not come up in time — see $N8N_LOG"; rm -f "$N8N_PID_FILE"; return 1 ;;
	esac
}

# ---------------------------------------------------------------------------
# Commands
# ---------------------------------------------------------------------------

cmd_up() {
	require_cmd npm
	require_cmd npx "npx ships with Node.js 8.2+. Update Node from https://nodejs.org/"
	require_cmd lsof "lsof is required for port readiness checks. On macOS it ships with the OS; on Linux install via your package manager (e.g. apt install lsof)."
	build_package
	link_package
	start_n8n
	echo
	echo -e "${GREEN}Environment ready.${RESET}"
	echo "  n8n editor: http://localhost:5678"
	echo "  Stop with:  $0 down"
}

# SIGTERM the given PID and every descendant in its process tree.
# Walks children first (post-order) so each layer can drain before its parent
# is signalled. Scoped strictly to the subtree rooted at the recorded PID —
# never touches unrelated n8n processes on the system.
kill_subtree() {
	local pid="$1"
	if ! kill -0 "$pid" 2>/dev/null; then return 0; fi
	local child
	for child in $(pgrep -P "$pid" 2>/dev/null || true); do
		kill_subtree "$child"
	done
	kill -TERM "$pid" 2>/dev/null || true
}

cmd_down() {
	if [ ! -f "$N8N_PID_FILE" ]; then
		info "no script-managed n8n to stop"
		return 0
	fi
	local pid; pid=$(cat "$N8N_PID_FILE")
	if kill -0 "$pid" 2>/dev/null; then
		# Bash doesn't forward SIGTERM to its children, and npx/npm spawn their
		# own child n8n process that won't die just because we kill the wrapper.
		# Walk the subtree explicitly.
		kill_subtree "$pid"
		ok "stopped n8n subtree rooted at pid $pid"
	fi
	rm -f "$N8N_PID_FILE"
}

cmd_status() {
	require_cmd lsof
	if port_is_listening "$N8N_PORT"; then
		local pid; pid=$(pid_on_port "$N8N_PORT")
		local managed=""
		if [ -f "$N8N_PID_FILE" ] && pid_in_subtree "$(cat "$N8N_PID_FILE")" "$pid"; then
			managed=" ${DIM}(this script)${RESET}"
		else
			managed=" ${YELLOW}(not managed by this script)${RESET}"
		fi
		echo -e "  ${GREEN}●${RESET} n8n  port $N8N_PORT  pid $pid${managed}"
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
