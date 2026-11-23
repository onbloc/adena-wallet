#!/bin/sh
# Builds a Release app and installs it on a connected phone.
#
#   scripts/deploy.sh ios|android
#
# DEVICE=<id> picks the phone when several are connected (iOS: UDID, Android: adb serial).
set -eu

cd "$(dirname "$0")/.."

fail() {
  echo "deploy: $*" >&2
  exit 1
}

deploy_ios() {
  command -v xcrun >/dev/null || fail "Xcode command line tools not found"

  udid="${DEVICE:-}"
  if [ -z "$udid" ]; then
    devices=$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && /connected/ { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9A-Fa-f]+-[0-9A-Fa-f]+$/) print $i }')
    [ -n "$devices" ] || fail "no connected iPhone (unlock it, plug in USB, trust this Mac)"
    [ "$(echo "$devices" | wc -l)" -eq 1 ] || fail "several iPhones connected: DEVICE=<udid> make deploy ios"
    udid="$devices"
  fi
  echo "deploy: iPhone $udid"

  log=$(mktemp -t deploy-ios)
  # --no-bundler: a Release build carries its JS, so Metro is not needed.
  CI=1 npx expo run:ios --device "$udid" --configuration Release --no-bundler 2>&1 | tee "$log" || true
  grep -q "Build Succeeded" "$log" || fail "build failed (log: $log)"

  # expo's own install can fail: some embedded frameworks come out unsigned.
  # Sign what is missing, then install the app ourselves.
  name=$(basename ios/*.xcworkspace .xcworkspace)
  app=$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/"$name"-*/Build/Products/Release-iphoneos/"$name.app" 2>/dev/null | head -1)
  [ -n "$app" ] || fail "built app not found in DerivedData"

  identity=$(codesign -dvv "$app" 2>&1 | sed -n 's/^Authority=\(Apple Development.*\)$/\1/p' | head -1)
  [ -n "$identity" ] || fail "app has no Apple Development signature (set the Team in Xcode)"

  ent=$(mktemp -t deploy-ent)
  codesign -d --entitlements "$ent" --xml "$app" 2>/dev/null
  for framework in "$app"/Frameworks/*.framework; do
    codesign -dv "$framework" >/dev/null 2>&1 ||
      codesign --force --sign "$identity" --preserve-metadata=identifier,entitlements "$framework"
  done
  codesign --force --sign "$identity" --entitlements "$ent" "$app"
  codesign --verify --deep --strict "$app" || fail "signature check failed"

  xcrun devicectl device install app --device "$udid" "$app"
  bundle=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
  xcrun devicectl device process launch --device "$udid" "$bundle" ||
    echo "deploy: installed, but launch failed. If this is the first install, trust the developer in" \
      "Settings > General > VPN & Device Management." >&2
}

deploy_android() {
  command -v adb >/dev/null || fail "adb not found (install the Android SDK platform-tools)"
  [ -n "$(adb devices | awk 'NR > 1 && $2 == "device"')" ] ||
    fail "no Android device (enable USB debugging, plug in, allow this Mac)"

  CI=1 npx expo run:android --variant release --no-bundler ${DEVICE:+--device "$DEVICE"}
}

case "${1:-}" in
  ios) deploy_ios ;;
  android) deploy_android ;;
  *) fail "usage: scripts/deploy.sh ios|android" ;;
esac
