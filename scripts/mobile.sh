#!/bin/sh
# Release builds for a phone.
#
#   scripts/mobile.sh build  ios|android   build only; prints the .app / .apk path
#   scripts/mobile.sh deploy ios|android   build, install and launch on a connected phone
#
# DEVICE=<id> picks the phone when several are connected (iOS: UDID, Android: adb serial).
set -eu

cd "$(dirname "$0")/../src/mock/app"

fail() {
  echo "mobile: $*" >&2
  exit 1
}

# --- iOS --------------------------------------------------------------------

ios_name() {
  basename ios/*.xcworkspace .xcworkspace
}

# Prints the UDID of the connected iPhone (or $DEVICE).
ios_udid() {
  command -v xcrun >/dev/null || fail "Xcode command line tools not found"
  if [ -n "${DEVICE:-}" ]; then
    echo "$DEVICE"
    return
  fi
  # State is "connected" or "available (paired)" (tunnel not up yet; devicectl brings it up on demand).
  devices=$(xcrun devicectl list devices 2>/dev/null | awk '/physical/ && / (connected|available)( |$)/ { for (i = 1; i <= NF; i++) if ($i ~ /^[0-9A-Fa-f]+-[0-9A-Fa-f]+$/) print $i }')
  [ -n "$devices" ] || fail "no connected iPhone (unlock it, plug in USB, trust this Mac)"
  [ "$(echo "$devices" | wc -l)" -eq 1 ] || fail "several iPhones connected: DEVICE=<udid> make deploy ios"
  echo "$devices"
}

# Newest Release .app in DerivedData.
ios_app() {
  name=$(ios_name)
  app=$(ls -dt "$HOME"/Library/Developer/Xcode/DerivedData/"$name"-*/Build/Products/Release-iphoneos/"$name.app" 2>/dev/null | head -1)
  [ -n "$app" ] || fail "built app not found in DerivedData"
  echo "$app"
}

# Embedded frameworks can come out unsigned, which the phone refuses to install.
# Sign what is missing with the app's own identity, then re-sign the app.
ios_fix_signing() {
  app=$1
  identity=$(codesign -dvv "$app" 2>&1 | sed -n 's/^Authority=\(Apple Development.*\)$/\1/p' | head -1)
  [ -n "$identity" ] || fail "app has no Apple Development signature (set the Team in Xcode)"

  ent=$(mktemp -t mobile-ent)
  codesign -d --entitlements "$ent" --xml "$app" 2>/dev/null
  for framework in "$app"/Frameworks/*.framework; do
    codesign -dv "$framework" >/dev/null 2>&1 ||
      codesign --force --sign "$identity" --preserve-metadata=identifier,entitlements "$framework"
  done
  codesign --force --sign "$identity" --entitlements "$ent" "$app"
  codesign --verify --deep --strict "$app" || fail "signature check failed"
}

build_ios() {
  command -v xcodebuild >/dev/null || fail "Xcode not found"
  name=$(ios_name)
  log=$(mktemp -t mobile-build-ios)
  echo "mobile: building $name (a few minutes; log: $log)"
  # Release carries its JS (bundled in a build phase), so Metro is not needed.
  xcodebuild -workspace "ios/$name.xcworkspace" -scheme "$name" -configuration Release \
    -destination 'generic/platform=iOS' -allowProvisioningUpdates -quiet >"$log" 2>&1 ||
    fail "build failed (log: $log)"
  app=$(ios_app)
  ios_fix_signing "$app"
  echo "mobile: built $app"
}

deploy_ios() {
  udid=$(ios_udid)
  echo "mobile: iPhone $udid"

  log=$(mktemp -t mobile-deploy-ios)
  # expo run:ios builds for this phone and tries to install; the install may fail on
  # unsigned frameworks, so only the build result matters here.
  CI=1 npx expo run:ios --device "$udid" --configuration Release --no-bundler 2>&1 | tee "$log" || true
  grep -q "Build Succeeded" "$log" || fail "build failed (log: $log)"

  app=$(ios_app)
  ios_fix_signing "$app"
  xcrun devicectl device install app --device "$udid" "$app"
  bundle=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$app/Info.plist")
  xcrun devicectl device process launch --device "$udid" "$bundle" ||
    echo "mobile: installed, but launch failed. If this is the first install, trust the developer in" \
      "Settings > General > VPN & Device Management." >&2
}

# --- Android ----------------------------------------------------------------

build_android() {
  [ -f android/gradlew ] || npx expo prebuild --platform android --no-install
  (cd android && ./gradlew assembleRelease)
  apk=$(ls -t android/app/build/outputs/apk/release/*.apk 2>/dev/null | head -1)
  [ -n "$apk" ] || fail "apk not found"
  echo "mobile: built $apk"
}

deploy_android() {
  command -v adb >/dev/null || fail "adb not found (install the Android SDK platform-tools)"
  [ -n "$(adb devices | awk 'NR > 1 && $2 == "device"')" ] ||
    fail "no Android device (enable USB debugging, plug in, allow this Mac)"

  CI=1 npx expo run:android --variant release --no-bundler ${DEVICE:+--device "$DEVICE"}
}

case "${1:-}:${2:-}" in
  build:ios) build_ios ;;
  build:android) build_android ;;
  deploy:ios) deploy_ios ;;
  deploy:android) deploy_android ;;
  *) fail "usage: scripts/mobile.sh build|deploy ios|android" ;;
esac
