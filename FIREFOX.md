# Adena on Firefox

This fork builds Adena as a Manifest V3 extension that also runs on Firefox. The default
build targets Chrome/Chromium; the Firefox target is a separate `--env browser=firefox`
webpack pass that emits `packages/adena-extension/dist-firefox`.

## Building

```
yarn install

yarn build            # chrome dist  -> packages/adena-extension/dist
yarn build:firefox    # firefox dist -> packages/adena-extension/dist-firefox
```

(`yarn build:firefox` rebuilds `adena-module` / `adena-torus-signin` first, then the
extension bundle.)

## Loading it in Firefox

- Quick test: open `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…"
  and pick `packages/adena-extension/dist-firefox/manifest.json`. (Temporary add-ons are
  removed when Firefox exits.)
- Dev loop: `npx web-ext run --source-dir packages/adena-extension/dist-firefox`.
  - On Ubuntu where Firefox is the **snap** package, pass
    `--firefox-profile=<dir>` pointing at a *non-hidden* directory inside `$HOME`
    (e.g. `~/adena-ff-profile`). The snap confinement blocks profiles under `~/.cache`
    or `/tmp`; Firefox then never starts its debugger server and web-ext fails with
    `connect ECONNREFUSED`.
- Permanent install (optional): `npx web-ext build -s packages/adena-extension/dist-firefox`
  then sign the resulting XPI (`npx web-ext sign --channel=unlisted`) or use a Firefox
  build that allows unsigned extensions (`xpinstall.signatures.required=false`).

## Releasing

`.github/workflows/build-firefox-xpi.yml` runs on `v*.*.*` tags (the same trigger as
the Chrome build and deploy in `build-deploy.yml`) and:

1. builds the Firefox bundle (`yarn build:firefox`);
2. packages it into an XPI with `scripts/build-firefox-xpi.sh` (the Firefox
   counterpart of `build-qa.sh`), producing
   `deploy-firefox/adena-extension-firefox-<tag>.xpi` plus a version-named copy in
   `deploy-firefox-latest/`;
3. uploads the XPI as a workflow artifact and attaches it to the GitHub release for
   the tag (creating the release if it does not exist yet).

Optional secrets:

- `AMO_API_KEY` + `AMO_API_SECRET`: when both are set, the XPI is signed through
  addons.mozilla.org (`--channel=unlisted`) so it installs in release Firefox.
  Without them the unsigned XPI is still published, for manual signing or for use in
  unbranded builds with `xpinstall.signatures.required=false`.
- `PRIVATE_ACCESS_TOKEN`: only needed to build against the private
  `adena-torus-signin` repository; without it the checked-in mock is used, so the
  workflow runs in forks too (enable Actions in the fork first).

## What differs from the Chrome build

| | Chrome build | Firefox build |
|---|---|---|
| Manifest source | `public/manifest.json` | `public/manifest.firefox.json` |
| Background | `background.service_worker` (service worker) | `background.scripts` (non-persistent event page — Firefox does not support extension service workers) |
| Add-on id | none needed | `browser_specific_settings.gecko.id = adena-wallet@gnomore.dev`, `strict_min_version: 115.0` (needed for `storage.session`) |
| Output dir | `dist/` | `dist-firefox/` |

Both builds share the manifest transform in `webpack.config.js`, which merges in the
icon set and the version from `packages/adena-extension/package.json` (so
`manifest.firefox.json` does not drift when the release scripts bump versions).

## Source changes for Firefox

- `webpack.config.js`
  - **`output.publicPath: ''`** — webpack's default `'auto'` public path throws
    `Automatic publicPath is not supported in this browser` inside Firefox content
    scripts (no `document.currentScript` in that execution context). The exception
    killed `content.js` before it could inject `inject.js`, so the whole dApp bridge
    (and `window.adena`) silently never worked on Firefox. Relative URLs are correct
    for the root-level extension pages that load assets. Applies to both build targets.
  - `--env browser=firefox` selects `public/manifest.firefox.json` and the
    `dist-firefox` output directory.
- `background.ts`: the tab-update handler also skips `moz-extension://` URLs
  (alongside `chrome://` / `chrome-extension://` / `about:`).
- `adena-module/ledger-connector.ts`: `AdenaLedgerConnector.isSupported()` plus guards so
  the Ledger helpers return `null`/`[]` instead of throwing `navigator.usb is undefined`
  when the browser has neither WebHID nor WebUSB.
- `select-hard-wallet-screen`: the "Continue with Ledger" button is disabled when Ledger
  support is unavailable.
- Popup header screens label `moz-extension` request origins as `moz-extension` (the
  fallback label previously said `chrome-extension` everywhere).
- **TxLink realm-document fetch is relayed through the background.** Firefox runs content
  scripts under an *expanded principal* (page + extension), so their `fetch()` calls are
  subject to the **page's CSP** in addition to the extension's. Gnoweb pages ship a
  restrictive `connect-src` that does not include the RPC host, so the realm-document
  query backing a TxLink was blocked with
  `Content-Security-Policy: The page's settings blocked the loading of a resource (connect-src) …`
  and clicking a TxLink died silently — no dialog, no navigation. `command-handler.ts`
  now requests the document from the background (`FETCH_REALM_DOCUMENT`, handled in
  `background.ts` through `inject/message/methods/gno-realm-document.ts`); the background
  is bound only by the extension CSP (`connect-src 'self' https: http://127.0.0.1:26657`).
  Chrome does not apply the page CSP to content scripts, which is why the same flow kept
  working there.
- **Web pages dismiss their own tab through `closeCurrentSurface()`.**
  `window.close()` only works for surfaces a script opened (popup windows, the toolbar
  popup panel). Firefox refuses it for tabs even when the extension created the tab
  itself — it logs `Scripts may only close windows that were opened by a script.` and
  the tab stays open (Chrome does allow closing a tab with no session history), so the
  onboarding "Start" button, the locked-wallet guard on `register.html`, "Account
  Added!" and the wallet-export Done button silently did nothing. The helper
  (`common/utils/browser-utils.ts`) keeps `window.close()` and, if the document is
  still alive 100 ms later, removes its own tab via `chrome.tabs.getCurrent` +
  `chrome.tabs.remove` (guarded so it can only ever close this very page).

## Known limitations on Firefox

- **Ledger hardware wallets are unavailable.** Firefox implements neither WebHID nor
  WebUSB, which the Ledger transport requires. All other wallet features (seed/Google
  accounts, dApp connect, signing, sessions, transfers) use standard extension APIs.
- `web-ext lint` reports two `FILE_TOO_LARGE` errors because `popup.js` / `web.js`
  exceed the linter's JS parser size limit. This only stops the linter from reading
  those files; the extension itself runs fine.
- `MISSING_DATA_COLLECTION_PERMISSIONS` is a lint warning, not an error — the
  `browser_specific_settings.gecko.data_collection_permissions` key would need to be
  set before submitting to addons.mozilla.org.

## Verification performed

Firefox 156 (Ubuntu snap, headless) and Chromium 152 against the built dist:

- `npx web-ext lint --source-dir packages/adena-extension/dist-firefox` — no manifest
  errors (only the items listed above).
- `web-ext run` installs the extension as a temporary add-on; the background event page
  starts and opens `register.html` on first install (visible in the profile's
  `sessionstore` and `extensions.json`).
- A local test page confirms: content script runs, `inject.js` is injected, `window.adena`
  exists in the page, and a full `window.adena.GetAccount()` call round-trips through
  content script → background and returns a wallet response.
- The onboarding flow was driven end to end in headless Firefox (temporary add-on →
  import a seed phrase → questionnaire → password → "You're All Set!" → Start). In the
  `register.html` tab the raw `window.close()` is refused with
  `Scripts may only close windows that were opened by a script.` (DOM Window pageError)
  and the tab stays open — the reported dead button; after `closeCurrentSurface()` the
  tab closes on Start. The same `window.close()` *does* close the tab in Chromium
  (verified over CDP against the Chrome dist), which is why the breakage is Firefox-only.
