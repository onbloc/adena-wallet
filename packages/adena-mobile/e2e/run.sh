#!/usr/bin/env bash
# Runs the Maestro E2E suite against an installed dev/release build.
#   pnpm e2e                          # every flow on the booted simulator/emulator
#   pnpm e2e --include-tags smoke     # tagged subset
#   pnpm e2e e2e/flows/03-lock-unlock.yaml
# Extra arguments go to `maestro test`. Env overrides: E2E_MNEMONIC, E2E_PASSWORD, E2E_RECIPIENT, E2E_CHAIN.
set -euo pipefail

cd "$(dirname "$0")/.."

MAESTRO_BIN="${MAESTRO_BIN:-$(command -v maestro || echo "$HOME/.maestro/bin/maestro")}"

if [ ! -x "$MAESTRO_BIN" ]; then
  echo "Maestro CLI not found. Install it: https://docs.maestro.dev/getting-started/installing-maestro" >&2
  exit 1
fi

MNEMONIC="${E2E_MNEMONIC:-abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about}"
PASSWORD="${E2E_PASSWORD:-Adena-E2E-Pass#2026}"
RECIPIENT="${E2E_RECIPIENT:-g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5}"
CHAIN="${E2E_CHAIN:-gnoland-1}"

ADDRESS="$(node e2e/scripts/derive-address.mjs "$MNEMONIC")"
DAPP_CONNECT_URL="$(node scripts/dapp-request.mjs connect --chain "$CHAIN")"
DAPP_TX_URL="$(node scripts/dapp-request.mjs send --chain "$CHAIN" --caller "$ADDRESS" --to "$RECIPIENT" --amount 1ugnot)"

# Default to the whole workspace unless a flow file or folder was given.
TARGET=e2e

for arg in "$@"; do
  [ -e "$arg" ] && TARGET=""
done

export MAESTRO_CLI_NO_ANALYTICS=1

exec "$MAESTRO_BIN" test \
  -e APP_ID=com.adena \
  -e MNEMONIC="$MNEMONIC" \
  -e PASSWORD="$PASSWORD" \
  -e RECIPIENT="$RECIPIENT" \
  -e ADDRESS_HEAD="${ADDRESS:0:6}" \
  -e DAPP_ORIGIN=https://example.com \
  -e DAPP_CONNECT_URL="$DAPP_CONNECT_URL" \
  -e DAPP_TX_URL="$DAPP_TX_URL" \
  "$@" ${TARGET}
