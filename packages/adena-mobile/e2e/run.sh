#!/usr/bin/env bash
# Runs the Maestro E2E suite against an installed dev/release build.
#   pnpm e2e                          # every flow on the booted simulator/emulator
#   pnpm e2e --include-tags smoke     # tagged subset
#   pnpm e2e e2e/flows/03-lock-unlock.yaml
# Extra arguments go to `maestro test`. Env overrides: E2E_PLATFORM (android | ios), E2E_MNEMONIC, E2E_PASSWORD,
# E2E_RECIPIENT, E2E_CHAIN.
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
DAPP_TX_URL="$(node scripts/dapp-request.mjs send --chain "$CHAIN" --caller "$ADDRESS" --to "$RECIPIENT" --amount 1ugnot --id "e2e-tx-$(date +%s)-1")"
# Answered request ids are remembered, so the retry after connecting needs its own id.
DAPP_TX_URL_2="$(node scripts/dapp-request.mjs send --chain "$CHAIN" --caller "$ADDRESS" --to "$RECIPIENT" --amount 1ugnot --id "e2e-tx-$(date +%s)-2")"

# Default to the whole workspace unless a flow file or folder was given.
TARGET=e2e

for arg in "$@"; do
  [ -e "$arg" ] && TARGET=""
done

export MAESTRO_CLI_NO_ANALYTICS=1

# The app id differs per platform (Android package app.adena, iOS bundle app.adena.Adena), so it must follow
# the device Maestro targets. Order: E2E_PLATFORM, then a --platform/-p given to Maestro, then an explicit
# --device/--udid (Android when adb lists it, otherwise iOS), then auto-detection, where a connected Android device
# or emulator wins over the iOS simulator. Without an explicit device, Maestro gets --platform so it picks a matching one.
DEVICE=""
ARG_PLATFORM=""
expect=""

for arg in "$@"; do
  case "$expect" in
    device) DEVICE="$arg"; expect=""; continue ;;
    platform) ARG_PLATFORM="$arg"; expect=""; continue ;;
  esac

  case "$arg" in
    --device | --udid) expect=device ;;
    --device=* | --udid=*) DEVICE="${arg#*=}" ;;
    --platform | -p) expect=platform ;;
    --platform=* | -p=*) ARG_PLATFORM="${arg#*=}" ;;
  esac
done

android_devices() {
  command -v adb >/dev/null 2>&1 && adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

PLATFORM="${E2E_PLATFORM:-$ARG_PLATFORM}"
PLATFORM="$(printf '%s' "$PLATFORM" | tr '[:upper:]' '[:lower:]')"

if [ -z "$PLATFORM" ]; then
  if [ -n "$DEVICE" ]; then
    if android_devices | grep -qxF "$DEVICE"; then
      PLATFORM=android
    else
      PLATFORM=ios
    fi
  elif android_devices | grep -q .; then
    PLATFORM=android
  else
    PLATFORM=ios
  fi
fi

case "$PLATFORM" in
  android) APP_ID=app.adena ;;
  ios) APP_ID=app.adena.Adena ;;
  *) echo "E2E_PLATFORM must be android or ios" >&2; exit 1 ;;
esac

PLATFORM_ARGS=()

# An explicit device already fixes the platform; a platform the caller passed is forwarded as is.
if [ -z "$DEVICE" ] && [ -z "$ARG_PLATFORM" ]; then
  PLATFORM_ARGS=(--platform "$PLATFORM")
fi

echo "e2e: platform=$PLATFORM app id=$APP_ID${DEVICE:+ device=$DEVICE}" >&2

exec "$MAESTRO_BIN" test \
  -e APP_ID="$APP_ID" \
  -e MNEMONIC="$MNEMONIC" \
  -e PASSWORD="$PASSWORD" \
  -e RECIPIENT="$RECIPIENT" \
  -e ADDRESS_HEAD="${ADDRESS:0:6}" \
  -e DAPP_ORIGIN=https://example.com \
  -e DAPP_CONNECT_URL="$DAPP_CONNECT_URL" \
  -e DAPP_TX_URL="$DAPP_TX_URL" \
  -e DAPP_TX_URL_2="$DAPP_TX_URL_2" \
  ${PLATFORM_ARGS[@]+"${PLATFORM_ARGS[@]}"} "$@" ${TARGET}
