#!/usr/bin/env bash
# process-scheduled-tasks.sh
# One scheduler for both Reminders and Recurring Tasks.
# - Health check
# - Process reminders
# - Process recurring tasks
# - Process SMS reminders
# - Lock to avoid overlaps
# - Robust logging
#
# Default run cadence (via systemd timer): every 30 minutes
set -euo pipefail

# ---------- Hard defaults (override via environment or systemd [Service] Environment=...) ----------
BACKEND_URL="${BACKEND_URL:-http://127.0.0.1:4005}"
HEALTH_PATH="${HEALTH_PATH:-/health}"
REMINDERS_PATH="${REMINDERS_PATH:-/api/v1/reminders/process}"
RECURRING_PATH="${RECURRING_PATH:-/api/v1/reminders/process-recurring}"
SMS_REMINDERS_PATH="${SMS_REMINDERS_PATH:-/api/v1/sms-reminders/process}"

# Optional auth header (leave empty if not needed). Example:
# AUTH_HEADER='Authorization: Bearer <token>'
AUTH_HEADER="${AUTH_HEADER:-}"

# Logging - with fallback defaults
LOGFILE="${LOGFILE:-/var/www/progressnet.io-app/logs/reminder-cron.log}"
LOCKFILE="${LOCKFILE:-/var/www/progressnet.io-app/logs/process-scheduled-tasks.lock}"

# Ensure LOGFILE and LOCKFILE are not empty
if [[ -z "$LOGFILE" ]]; then
    LOGFILE="/tmp/reminder-cron.log"
    echo "Warning: LOGFILE was empty, using fallback: $LOGFILE"
fi

if [[ -z "$LOCKFILE" ]]; then
    LOCKFILE="/tmp/process-scheduled-tasks.lock"
    echo "Warning: LOCKFILE was empty, using fallback: $LOCKFILE"
fi

# Create directories
mkdir -p "$(dirname "$LOGFILE")" || {
    echo "Error: Cannot create log directory $(dirname "$LOGFILE")"
    exit 1
}
mkdir -p "$(dirname "$LOCKFILE")" || {
    echo "Error: Cannot create lock directory $(dirname "$LOCKFILE")"
    exit 1
}

# Verify variables are set
if [[ -z "$BACKEND_URL" ]]; then
    echo "Error: BACKEND_URL is empty or not set"
    exit 1
fi

# curl defaults
CURL_OPTS=(--silent --show-error --max-time 30)
[[ -n "$AUTH_HEADER" ]] && CURL_OPTS+=(-H "$AUTH_HEADER")

log() {
    local ts; ts="$(date '+%Y-%m-%d %H:%M:%S')"
    local msg="[${ts}] $*"

    # Ensure LOGFILE is still set when this function is called
    if [[ -z "${LOGFILE:-}" ]]; then
        echo "Error: LOGFILE is empty in log function"
        echo "$msg"
        return 1
    fi

    # Try to log to file and stdout
    if ! printf '%s\n' "$msg" | tee -a "$LOGFILE" 2>/dev/null; then
        # If tee fails, at least output to stdout
        printf '%s\n' "$msg"
        printf '%s\n' "Warning: Failed to write to log file: $LOGFILE"
    fi
}

build_urls() {
    # Remove trailing slashes and build URLs
    local base_url="${BACKEND_URL%/}"
    HEALTH_URL="${base_url}${HEALTH_PATH}"
    REMINDERS_URL="${base_url}${REMINDERS_PATH}"
    RECURRING_URL="${base_url}${RECURRING_PATH}"
    SMS_REMINDERS_URL="${base_url}${SMS_REMINDERS_PATH}"

    # Debug output
    log "URLs built: health=$HEALTH_URL reminders=$REMINDERS_URL recurring=$RECURRING_URL sms=$SMS_REMINDERS_URL"
}

main() {
    build_urls
    log "Start scheduled tasks run (PID=$$)"
    log "Using BACKEND_URL=$BACKEND_URL"
    log "Using LOGFILE=$LOGFILE"
    log "Using LOCKFILE=$LOCKFILE"

    # Create temp directory if it doesn't exist
    mkdir -p /tmp

    # 1) Health check
    local code
    log "Checking health at: $HEALTH_URL"
    code="$(curl "${CURL_OPTS[@]}" -o /tmp/health.json -w '%{http_code}' "$HEALTH_URL" 2>/dev/null || echo "000")"

    if [[ "$code" != "200" ]]; then
        log "Health check failed http=$code url=$HEALTH_URL"
        if [[ -s /tmp/health.json ]]; then
            log "Response body:"
            sed 's/^/BODY: /' /tmp/health.json | while read -r line; do log "$line"; done
        fi
        exit 2
    fi
    log "Backend healthy"

    # 2) Process reminders
    log "Processing reminders at: $REMINDERS_URL"
    code="$(curl "${CURL_OPTS[@]}" -o /tmp/reminders.json -w '%{http_code}' -X POST "$REMINDERS_URL" 2>/dev/null || echo "000")"

    if [[ "$code" != "200" && "$code" != "204" ]]; then
        log "Reminders processing failed http=$code url=$REMINDERS_URL"
        if [[ -s /tmp/reminders.json ]]; then
            log "Response body:"
            sed 's/^/BODY: /' /tmp/reminders.json | while read -r line; do log "$line"; done
        fi
        exit 3
    fi

    if command -v jq >/dev/null 2>&1 && [[ -s /tmp/reminders.json ]]; then
        local processed errors
        processed="$(jq -r '.processed // 0' /tmp/reminders.json 2>/dev/null || echo 0)"
        errors="$(jq -r '.errors // [] | length' /tmp/reminders.json 2>/dev/null || echo 0)"
        log "Reminders OK processed=$processed errors=$errors"
    else
        log "Reminders OK (no jq or empty body)"
    fi

    # 3) Process recurring tasks
    log "Processing recurring tasks at: $RECURRING_URL"
    code="$(curl "${CURL_OPTS[@]}" -o /tmp/recurring.json -w '%{http_code}' -X POST "$RECURRING_URL" 2>/dev/null || echo "000")"

    log "Recurring endpoint returned HTTP status: $code"

    # Check for successful HTTP status codes (2xx range)
    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
        if command -v jq >/dev/null 2>&1 && [[ -s /tmp/recurring.json ]]; then
            local processed errors success
            processed="$(jq -r '.processed // 0' /tmp/recurring.json 2>/dev/null || echo 0)"
            errors="$(jq -r '.errors // [] | length' /tmp/recurring.json 2>/dev/null || echo 0)"
            success="$(jq -r '.success // false' /tmp/recurring.json 2>/dev/null || echo false)"
            log "Recurring OK processed=$processed errors=$errors success=$success"

            # Log the full response for debugging
            log "Recurring response: $(cat /tmp/recurring.json 2>/dev/null || echo 'no response body')"
        else
            log "Recurring OK (no jq or empty body)"
        fi
    elif [[ "$code" == "404" ]]; then
        log "Recurring endpoint not found (404) - skipping recurring tasks processing"
        log "This might be expected if recurring tasks are not implemented yet"
    else
        log "Recurring processing failed http=$code url=$RECURRING_URL"
        if [[ -s /tmp/recurring.json ]]; then
            log "Response body:"
            sed 's/^/BODY: /' /tmp/recurring.json | while read -r line; do log "$line"; done
        fi
        exit 4
    fi

    if command -v jq >/dev/null 2>&1 && [[ -s /tmp/recurring.json ]]; then
        local created updated
        created="$(jq -r '.created // 0' /tmp/recurring.json 2>/dev/null || echo 0)"
        updated="$(jq -r '.updated // 0' /tmp/recurring.json 2>/dev/null || echo 0)"
        log "Recurring OK created=$created updated=$updated"
    else
        log "Recurring OK (no jq or empty body)"
    fi

    # 4) Process SMS reminders
    log "Processing SMS reminders at: $SMS_REMINDERS_URL"
    code="$(curl "${CURL_OPTS[@]}" -o /tmp/sms-reminders.json -w '%{http_code}' -X POST "$SMS_REMINDERS_URL" 2>/dev/null || echo "000")"

    log "SMS reminders endpoint returned HTTP status: $code"

    # Check for successful HTTP status codes (2xx range)
    if [[ "$code" =~ ^2[0-9][0-9]$ ]]; then
        if command -v jq >/dev/null 2>&1 && [[ -s /tmp/sms-reminders.json ]]; then
            local processed errors sent skipped failed
            processed="$(jq -r '.processed // 0' /tmp/sms-reminders.json 2>/dev/null || echo 0)"
            errors="$(jq -r '.errors // [] | length' /tmp/sms-reminders.json 2>/dev/null || echo 0)"
            sent="$(jq -r '.summary.sent // 0' /tmp/sms-reminders.json 2>/dev/null || echo 0)"
            skipped="$(jq -r '.summary.skipped // 0' /tmp/sms-reminders.json 2>/dev/null || echo 0)"
            failed="$(jq -r '.summary.failed // 0' /tmp/sms-reminders.json 2>/dev/null || echo 0)"
            log "SMS reminders OK processed=$processed sent=$sent skipped=$skipped failed=$failed errors=$errors"

            # Log the full response for debugging
            log "SMS reminders response: $(cat /tmp/sms-reminders.json 2>/dev/null || echo 'no response body')"
        else
            log "SMS reminders OK (no jq or empty body)"
        fi
    elif [[ "$code" == "404" ]]; then
        log "SMS reminders endpoint not found (404) - skipping SMS reminders processing"
        log "This might be expected if SMS reminders are not implemented yet"
    else
        log "SMS reminders processing failed http=$code url=$SMS_REMINDERS_URL"
        if [[ -s /tmp/sms-reminders.json ]]; then
            log "Response body:"
            sed 's/^/BODY: /' /tmp/sms-reminders.json | while read -r line; do log "$line"; done
        fi
        # Note: We don't exit on SMS failure to allow other tasks to continue
        log "Warning: SMS reminders failed but continuing with other tasks"
    fi

    # 5) Trim log (only if it exists and is large enough)
    if [[ -f "$LOGFILE" ]] && [[ $(wc -l < "$LOGFILE") -gt 500 ]]; then
        tail -n 500 "$LOGFILE" > "$LOGFILE.tmp" && mv "$LOGFILE.tmp" "$LOGFILE"
        log "Log trimmed to last 500 lines"
    fi

    log "Completed scheduled tasks run"
}

# Debug: Show what we're about to execute
echo "Script starting with:"
echo "  BACKEND_URL=$BACKEND_URL"
echo "  LOGFILE=$LOGFILE"
echo "  LOCKFILE=$LOCKFILE"
echo "  USER=$(whoami)"
echo "  PWD=$PWD"

# ---- Run with a non-blocking lock to avoid overlaps ----
# Using flock directly on the lockfile path.
# We export functions into the subshell so flock can run them.
# Detect flock location (varies by OS)
FLOCK_BIN="/usr/bin/flock"
if ! command -v /usr/bin/flock >/dev/null 2>&1; then
    # Try other common locations
    if command -v flock >/dev/null 2>&1; then
        FLOCK_BIN="flock"
    else
        echo "Warning: flock not found, running without file locking"
        FLOCK_BIN=""
    fi
fi

if [[ -n "$FLOCK_BIN" ]]; then
    if ! $FLOCK_BIN -n "$LOCKFILE" bash -c "
    $(declare -f log)
    $(declare -f build_urls)
    $(declare -f main)

    # Export variables to the subshell
    export BACKEND_URL='$BACKEND_URL'
    export HEALTH_PATH='$HEALTH_PATH'
    export REMINDERS_PATH='$REMINDERS_PATH'
    export RECURRING_PATH='$RECURRING_PATH'
    export SMS_REMINDERS_PATH='$SMS_REMINDERS_PATH'
    export AUTH_HEADER='$AUTH_HEADER'
    export LOGFILE='$LOGFILE'
    export LOCKFILE='$LOCKFILE'

    main
"; then
        echo "Failed to acquire lock or script failed"
        exit 1
    fi
else
    # Run without locking if flock is not available
    echo "Running without file locking (flock not available)"
    main
fi