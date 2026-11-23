# Adena Mobile

React Native (CLI, New Architecture, Hermes) wallet for iOS and Android. Both platforms share one design system, *ADENA / Bold Monochrome*.

## Getting started

### Prerequisites

| Tool | Version / note |
| --- | --- |
| Node.js | 26 (`.nvmrc` at the repo root; `engines` requires >= 22.11) |
| pnpm | 11.28.11 (`corepack enable` picks it up from the root `packageManager`) |
| iOS | macOS with Xcode (deployment target iOS 15.1), Ruby + Bundler for CocoaPods (`Gemfile`) |
| Android | Android Studio, JDK 17, SDK Platform 37 + Build-Tools 37.0.0, NDK 27.1.12297006, `ANDROID_HOME` set |

### Install and run

The app is a standalone pnpm project (excluded from the repository workspace, with its own
`pnpm-lock.yaml`, `pnpm-workspace.yaml` policies and `.npmrc`), so it is installed separately.

```bash
corepack enable

# repository root: only needed for the adena-module parity tests (linked via link:../adena-module)
pnpm install
pnpm build:module

# the app
cd packages/adena-mobile
pnpm install
pnpm start --reset-cache     # Metro (keep it running)

# iOS (first time, and after native dependency changes)
cd ios && bundle install && bundle exec pod install && cd ..
pnpm ios                     # or open ios/AdenaMobile.xcworkspace in Xcode

# Android (emulator running or device connected with USB debugging)
pnpm android
```

After pulling changes that add native modules, reinstall pods / rebuild the native app; a JS bundle that
imports a native module missing from the installed binary fails at startup.

| Script | Purpose |
| --- | --- |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint, including the rule that UI components may not import services, repositories, stores or the DI container |
| `test` | Jest unit and component tests (no simulator needed) |
| `bundle:check` | Production Metro bundle without native tooling |

### Storybook (UI QA without a native build)

Pages and components take props only, so every screen state can be reviewed in a browser through react-native-web:

```bash
pnpm storybook          # http://localhost:6006
pnpm build:storybook    # static build in storybook-static/ (shareable)
```

* Stories live next to their component (`*.stories.tsx`); shared sample data is in `src/stories/fixtures.ts`.
* Each story renders inside a 390 x 844 phone frame with the app's Inter fonts and safe-area insets (`.storybook/preview.tsx`).
* `__tests__/stories.test.tsx` renders every story under Jest (portable stories), so a story that throws fails `pnpm test`.
* The web build approximates native rendering. Native-only behaviour (keyboard, biometrics, overlay sheet window) still needs a simulator check.

### Tests

* `pnpm test` runs every Jest suite; `pnpm test:coverage` adds a coverage report for `src/` (written to `coverage/`).
* Unit tests live in `__tests__/unit/`, one file per source file, mirroring `src/` (e.g. `src/utils/amount.ts` → `__tests__/unit/utils/amount.test.ts`). Pages and containers are flattened by folder name (`__tests__/unit/components/pages/send-amount.test.tsx`, `__tests__/unit/containers/send-amount-screen.test.tsx`).
* Cross-cutting scenario tests stay at the top of `__tests__/` (dApp flow, migrations, hardening, adena-module parity).
* Shared helpers: `createTestContainer` (in-memory DI container with fake chain/HTTP), `renderScreen`/`setupWallet` for containers, `query-wrapper` for query hooks.
* Known bugs found while writing tests are recorded as `it.todo` / `it.skip` with the expected behavior.

### E2E (Maestro)

Flows live in `e2e/flows`, reusable steps in `e2e/subflows`. They drive an installed build through testIDs and visible text.

```sh
# Install the CLI once: https://docs.maestro.dev/getting-started/installing-maestro
pnpm e2e                                  # every flow on the booted simulator/emulator
pnpm e2e:smoke                            # onboarding + lock/unlock only
pnpm e2e --device <udid> e2e/flows/07-dapp-connect.yaml
```

* `e2e/run.sh` derives the test account address and builds the dApp deep links with `scripts/dapp-request.mjs`, then passes them to Maestro as env vars. Override `E2E_MNEMONIC`, `E2E_PASSWORD`, `E2E_RECIPIENT`, `E2E_CHAIN` as needed.
* Every flow starts from a wiped app (`clearState` plus `clearKeychain` on iOS). **Run it on a dedicated simulator**, not one holding wallets you care about: `xcrun simctl create "Adena E2E" ...`, then install the `.app` from DerivedData with `xcrun simctl install`.
* Debug builds need Metro running (`pnpm start`). A release build embeds the bundle and needs nothing else.
* Flows never broadcast a transaction; the dApp flow rejects the signing request, so the default account needs no balance.

### Release builds (Android)

Release signing is read from Gradle properties and never committed. Put these in `~/.gradle/gradle.properties` (or pass `ORG_GRADLE_PROJECT_<name>` in CI):

```properties
ADENA_UPLOAD_STORE_FILE=/absolute/path/to/upload.keystore
ADENA_UPLOAD_STORE_PASSWORD=...
ADENA_UPLOAD_KEY_ALIAS=...
ADENA_UPLOAD_KEY_PASSWORD=...
```

`packageRelease` / `bundleRelease` fail if any is missing. Release builds are minified with R8 (`android/app/proguard-rules.pro`). Debug builds use the machine's `~/.android/debug.keystore`, which the Android Gradle plugin creates.

### Trying the dApp flow

`scripts/dapp-request.mjs` builds request links and decodes responses:

```bash
node scripts/dapp-request.mjs connect --chain dev.gnoswap
node scripts/dapp-request.mjs send --chain dev.gnoswap --caller <g1 sender> --to <g1 recipient> --amount 1000ugnot
node scripts/dapp-request.mjs call --chain dev.gnoswap --caller <g1 sender> --pkg gno.land/r/gnoswap/gns --func Transfer --args <g1 recipient>,1000000
node scripts/dapp-request.mjs tx --chain dev.gnoswap --caller <g1 sender> --send <g1 recipient>:1ugnot --call gno.land/r/gnoswap/gns:Transfer:<g1 recipient>,1000
node scripts/dapp-request.mjs decode '<callback url from the browser>'
```

Add `--sign-only` for `sign-transaction` (signed, not broadcast). `tx` builds one multi-message transaction (up to 16 messages); repeat `--send` / `--call` in the order the messages should run.


```bash
# Android: opens the overlay sheet on top of the current app
adb shell am start -a android.intent.action.VIEW -d "adena://request?payload=<base64url JSON>"
# iOS simulator: opens the in-app request screen
xcrun simctl openurl booted "adena://request?payload=<base64url JSON>"
```

Build the payload with `buildDappRequestUrl` (`src/deeplink/dapp-protocol.ts`) or see the protocol section below.
