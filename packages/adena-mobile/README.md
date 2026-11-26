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

### Cloud backup (iCloud / Google Drive)

Settings → *iCloud backup* (iOS) / *Google Drive backup* (Android) saves an encrypted copy of every keyring (recovery phrases, private keys, account names and indices) to the user's own cloud. The welcome screen offers *Restore from iCloud / Google Drive*.

* **Encryption**: the vault cipher (scrypt + XChaCha20-Poly1305) with a separate *backup password* and a costlier scrypt (`N = 2^17`, `src/security/backup-codec.ts`). The file faces unlimited offline guessing, so the backup password has its own, stricter policy (12+ characters, zxcvbn score 3+), must differ from the wallet password, and is never stored (its fields opt out of iCloud Keychain / Google Password Manager autofill). Only the backup id, date and revision are readable without it; all three are checked against the encrypted copy. KDF parameters read from a file are capped at `N = 2^18` (256 MiB), and the envelope (salt, nonce, ciphertext) and the account layout (indices below 2^31, at most 100 keyrings / 1000 accounts, names up to 256 characters) are validated before any key is derived or any vault is written; a damaged file is never counted as a wrong password.
* **Storage**: `CloudBackupStore` (`src/repositories/cloud-backup/`) over the `AdenaCloudBackup` TurboModule (`src/native/NativeAdenaCloudBackup.ts`), one file per wallet: `adena-backup-<id>.json`.
  * iOS: `ios/AdenaMobile/AdenaCloudBackupStore.swift` + `AdenaCloudBackup.mm`, the app's iCloud container `Documents` folder. Info.plist declares no `NSUbiquitousContainers`, so iCloud Drive does not show the folder.
  * Android: `android/app/src/main/java/com/adena/cloudbackup/`, the Drive `appDataFolder` (hidden from the user's Drive) via Drive REST v3. The OAuth access token comes from the Google Identity Services Authorization API and never leaves native code.
* **Sync**: nothing is uploaded without the backup password. After accounts or keyrings change, the backup screen shows *Back up again* and the settings row shows *Out of date*. Each write bumps a revision in the file; a device whose last known revision differs (another device wrote, or the cloud copy was rolled back or damaged) shows *Updated on another device* / *Older backup found* and replaces the file only after an explicit *Replace*.
* **Restore**: backup password (throttled like the wallet password, with its own counter that a factory reset keeps) → new wallet password → `WalletService.restoreWallet`, which restores account order, avatar colors and the selected account, and removes the new vault again if any account fails to rebuild. On iOS the welcome screen offers the restore whenever iCloud is available (a fresh install may not have synced the file list yet); the restore page lists files through `NSMetadataQuery`, starts downloading placeholders and offers *Check again*.
* **Reset / delete**: a factory reset leaves the cloud copy alone. The backup screen lists every Adena backup in the account (including other wallets') with a delete action that asks for the wallet password; before setup, the restore page can delete a backup after two confirmations.

One-time setup outside the repository:

1. **Apple** (developer account): create the iCloud container `iCloud.com.adena`, enable the iCloud capability on the App ID `app.adena.Adena` and assign the container to it, then regenerate the provisioning profiles. The entitlements (`ios/AdenaMobile/AdenaMobile.entitlements`) already list the container; a device build fails to sign until the profile includes it.
2. **Google Cloud** (project that owns the app):
   * Enable the *Google Drive API* and add the `https://www.googleapis.com/auth/drive.appdata` scope to the OAuth consent screen, and publish the consent screen (plus any verification it asks for) before release.
   * Create an OAuth client of type *Android* for package `app.adena` with the SHA-1 of each signing key (debug keystore, upload key, and the Play App Signing key from the Play Console). The Authorization API matches the app by package name and certificate, so no client id is read by the app.
3. Rebuild the native apps (`pod install`, Gradle) after pulling this change.

On-device checks (not covered by Jest):

* iOS, signed in to iCloud with iCloud Drive on: back up, delete the app, reinstall, restore. Signed out of iCloud: the settings row and the restore option are hidden. Full iCloud storage: *iCloud storage is full*.
* iOS, second device on the same Apple Account: the backup appears after iCloud sync (it can take a while) and restores.
* Android with Play services: first backup shows the Google account / consent sheet; cancel shows *Not signed in*; airplane mode shows *Can't reach Google Drive*; the file does not appear in the Drive app. Revoke access at myaccount.google.com → the backup screen offers *Try again* and asks again.
* Both: wrong backup passwords start the back-off after the free attempts; *Delete backup* removes the file; a factory reset keeps it.
* Both, two devices on one account: restore on device B, back up on device A → B shows *Updated on another device* and asks before replacing.
* iOS, fresh install with an existing backup: *Restore from iCloud* shows at once; the list fills in (or *Check again* finds it) once iCloud metadata syncs, and a not-downloaded file restores. Back up with the device locked right after: the upload is not held back by file protection.
* Android: leave the consent sheet open, kill the app's activity (Don't keep activities) and return: the call fails after the timeout instead of hanging; revoke the token mid-session: the next request clears it and retries once.

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

Add `--sign-only` for `sign-transaction` (signed, not broadcast). Transaction requests (`sign-transaction`, `sign-and-broadcast`) must set `expiresAt` (ms since epoch) no more than 24 hours after the wallet receives them, or they are answered `INVALID_REQUEST`; the script sets one hour (`--expires-in <seconds>`). `expiresAt` stays optional for `connect`. `tx` builds one multi-message transaction (up to 16 messages); repeat `--send` / `--call` in the order the messages should run.


```bash
# Android: opens the overlay sheet on top of the current app
adb shell am start -a android.intent.action.VIEW -d "adena://request?payload=<base64url JSON>"
# iOS simulator: opens the in-app request screen
xcrun simctl openurl booted "adena://request?payload=<base64url JSON>"
```

Build the payload with `buildDappRequestUrl` (`src/deeplink/dapp-protocol.ts`) or see the protocol notes at the top of that file.
