# adena-mobile

React Native app for Adena. It shares wallet logic with the browser extension
(`adena-module` and the extension's services, repositories and dApp message
handling) and replaces the extension's platform pieces (storage, crypto,
background messaging, approval popups) with mobile implementations in
`src/platform`.

## Setup

```sh
yarn install                                # from the repository root
yarn workspace adena-mobile prepare:native  # verify + unpack prebuilt native libs
yarn workspace adena-mobile pods            # iOS only
```

Install scripts are disabled in this repository. `prepare:native` unpacks the
prebuilt libsodium shipped with `react-native-libsodium` only after its archive
matches the SHA-256 pinned in `scripts/prepare-native-deps.js`.

Android debug builds need a local debug key, which is not committed:

```sh
keytool -genkeypair -v -storetype PKCS12 -keystore android/app/debug.keystore \
  -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Android Debug,O=Android,C=US"
```

`android/app/build.gradle` expects the alias `androiddebugkey`; set its
passwords to the values that file uses.

## Run

```sh
yarn workspace adena-mobile start
yarn workspace adena-mobile ios       # or: android
yarn workspace adena-mobile test
```

## Notes

- React Native 0.77 is the last release on React 18, which the extension's
  shared state (Recoil) requires.
- `ios/Podfile` builds the `fmt` pod as C++17; RN 0.77's fmt does not compile
  with the clang in Xcode 26+.
- The app refuses to create or open a wallet if the native crypto fails its
  self-test against libsodium vectors (`verifyCryptoProvider`).
