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

# The app id differs per platform (Android package app.adena, iOS bundle app.adena.Adena), and one run has one app
# id, so every platform input must agree: E2E_PLATFORM, a --platform/-p given to Maestro, and each id of an explicit
# --device/--udid list (Android when adb lists it, otherwise iOS). Disagreeing inputs stop the run. Without any of
# them, a connected Android device or emulator wins over the iOS simulator, and Maestro gets --platform to match.
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

fail() {
  echo "e2e: $*" >&2
  exit 1
}

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

android_devices() {
  command -v adb >/dev/null 2>&1 && adb devices | awk 'NR > 1 && $2 == "device" { print $1 }'
}

ENV_PLATFORM="$(lower "${E2E_PLATFORM:-}")"
ARG_PLATFORM="$(lower "$ARG_PLATFORM")"

for value in "$ENV_PLATFORM" "$ARG_PLATFORM"; do
  case "$value" in
    "" | android | ios) ;;
    *) fail "platform must be android or ios, got '$value'" ;;
  esac
done

DEVICE_PLATFORM=""

if [ -n "$DEVICE" ]; then
  ANDROID_IDS="$(android_devices || true)"
  IFS=',' read -r -a DEVICE_IDS <<< "$DEVICE"

  for id in "${DEVICE_IDS[@]}"; do
    id="$(printf '%s' "$id" | tr -d '[:space:]')"
    [ -z "$id" ] && continue

    if printf '%s\n' "$ANDROID_IDS" | grep -qxF "$id"; then
      current=android
    else
      current=ios
    fi

    if [ -n "$DEVICE_PLATFORM" ] && [ "$DEVICE_PLATFORM" != "$current" ]; then
      fail "--device mixes Android and iOS devices ($DEVICE); run each platform separately"
    fi

    DEVICE_PLATFORM="$current"
  done
fi

PLATFORM=""

for pair in "E2E_PLATFORM:$ENV_PLATFORM" "--platform:$ARG_PLATFORM" "--device:$DEVICE_PLATFORM"; do
  source="${pair%%:*}"
  value="${pair#*:}"
  [ -z "$value" ] && continue

  if [ -n "$PLATFORM" ] && [ "$PLATFORM" != "$value" ]; then
    fail "$source says $value but $PLATFORM_SOURCE says $PLATFORM; make them agree"
  fi

  PLATFORM="$value"
  PLATFORM_SOURCE="$source"
done

if [ -z "$PLATFORM" ]; then
  if android_devices | grep -q .; then
    PLATFORM=android
  else
    PLATFORM=ios
  fi
fi

case "$PLATFORM" in
  android) APP_ID=app.adena ;;
  ios) APP_ID=app.adena.Adena ;;
esac

PLATFORM_ARGS=()

# An explicit device already fixes the platform; a platform the caller passed is forwarded as is and agrees.
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
