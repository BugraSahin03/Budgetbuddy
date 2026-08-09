#!/bin/sh
set -eu

: "${ALFRED_TELEGRAM_TARGET:?ALFRED_TELEGRAM_TARGET is required}"

exec /usr/bin/openclaw agent \
  --agent main \
  --channel telegram \
  --reply-account default \
  --reply-channel telegram \
  --reply-to "$ALFRED_TELEGRAM_TARGET" \
  --session-key "agent:main:weekly-finance-report" \
  --thinking high \
  --timeout 600 \
  --deliver \
  --message-file /usr/local/lib/alfred-weekly-report/weekly-prompt.md
