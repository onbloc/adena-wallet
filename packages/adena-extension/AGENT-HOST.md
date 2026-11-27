# AI agent connection

Adena's side of [adena-mcp](../../misc/adena-mcp/README.md): AI agents on
the user's computer reach Adena through a native messaging host
(`xyz.onbloc.adena_agent`), ask the user to connect, to authorize session
accounts, and, if the user allows it, to sign with the master account. Adena
checks every request against the user's policy and the agent's connection,
and the user approves each signature in a popup. The master key never leaves
Adena.

The MCP server, the host and their protocol are documented in
[misc/adena-mcp/docs](../../misc/adena-mcp/docs): how it works, security and
the API.

- [Code map](#code-map)
- [Turning it on](#turning-it-on)
- [Handling a request](#handling-a-request)
- [Connections](#connections)
- [Agent policy](#agent-policy)
- [Approval popups](#approval-popups)
- [Storage](#storage)
- [Keeping the master key safe](#keeping-the-master-key-safe)
- [Request methods](#request-methods)
- [Errors](#errors)
- [Tests](#tests)

## Code map

| Path (`src/`) | Role |
|---|---|
| `inject/agent-host/agent-host-bridge.ts` | Opens and closes the native port (`chrome.runtime.connectNative`), dispatches host messages, records the connection status |
| `inject/agent-host/agent-host-handler.ts` | Handles each request: connection check, policy, wallet context, popups, results |
| `inject/agent-host/agent-host-protocol.ts` | Request parsing and validation: methods, peer, session policy, transaction messages |
| `inject/agent-host/agent-host-settings.ts` | Encrypted policy and connection grants, connection tokens |
| `inject/agent-host/agent-policy-key.ts` | The password and salt the policy is encrypted with, in extension pages |
| `inject/agent-host/agent-approval-queue.ts` | One approval at a time, and cancellation per request |
| `inject/agent-host/agent-popup.ts` | Popup size check and detection of open Adena popups |
| `inject/message/sender-identity.ts` | Web page requests take their identity from the browser, never `agent:` |
| `inject/message/methods/common.ts` | Popups accept answers only from Adena's own pages (and agent popups only from their window) |
| `pages/popup/certify/agent-connection` | Settings > Security & Privacy > AI Agent Connection |
| `services/wallet/wallet-establish.ts` | Removing an agent under Connected Apps drops its grants |
| `services/wallet/wallet.ts` | Password change re-encrypts the agent records; reset deletes them |

`manifest.json` declares `nativeMessaging` as an optional permission, so the
feature adds no permission prompt on update.

## Turning it on

**Settings → Security & Privacy → AI Agent Connection:**

| Control | Default | Effect |
|---|---|---|
| Enable agent connection | off | Requests the `nativeMessaging` permission and opens the native port. A service worker started before the permission was granted has no `connectNative`; the screen then offers **Reload Adena** |
| Allow master account requests | off | Lets agents ask for `send_transaction` / `sign_transaction` with the master account. Off, they are refused before any popup |
| Allow script (vm/run) sessions | off | Lets agents ask for sessions with `vm/run`. A script can call any realm as the user |
| Maximum session spend limit | 10 GNOT | The most one session may spend over its whole lifetime, gas included |

The screen shows the connection status, including when another browser
already serves agents (the host's `host_busy` notification). Turning the
connection off, or removing the permission, drops every agent's grants.

## Handling a request

`agent-host-bridge.ts` connects when the switch is on and the permission is
granted, and passes each message from the host to `handleAgentHostMessage`:

1. A `host_busy` notification only updates the status.
2. The request is parsed (`id`, known `method`, object `params`, the host's
   `peer`, the `token`); anything malformed is answered with
   `invalid_request`.
3. `cancel` aborts the named request and expects no answer. Every other
   request gets a cancellation signal before its first await, so a cancel
   during preparation is not lost; a closed port cancels them all.
4. Methods other than `ping`, `get_status` and `connect` need a verified
   connection (see [Connections](#connections)); the account the check passed
   for is pinned for the rest of the request.
5. The handler resolves the wallet context (unlocked wallet, that account,
   current network), reads the policy, validates the params, and opens a
   popup when the method needs one.
6. The response goes back on the same port only if it is still open.

## Connections

An agent is the site `agent://<name>.agent` (shown under Connected Apps),
where `name` is the MCP client's name lowercased to `[a-z0-9-]` (at most 32
characters). A connection is bound to one process:

- `connect` refuses a request without the peer's pid and start time
  (`unidentified_agent`); the host reads them from the OS.
- Connections are approved one at a time. The connection popup shows
  `<name> (<executable>)` and asks even when the name is already connected,
  since each process needs its own approval. It unlocks the wallet if needed.
- On approval Adena issues 32 random bytes as the token and records its
  SHA-256 hash with the pid and start time for the approved account. The
  token is returned once and never stored.
- A request counts as connected only if the site is established for the
  current account and a grant matches the token's hash, pid and start time.
  While the wallet is locked the encrypted grants cannot be read: a match in
  the plain index (see [Storage](#storage)) yields `wallet_locked`, never
  access.
- Removing the agent under Connected Apps, turning the connection off,
  resetting the wallet or losing the permission drops its grants. At most 8
  grants are kept per agent and account.

## Agent policy

Checked in `agent-host-protocol.ts` before any popup opens.

**Sessions** (`create_session`):

| Rule | |
|---|---|
| `allow_paths` | `vm/exec:<realm path>` with at least 4 segments, the second `r` (e.g. `gno.land/r/demo/counter`), and `bank/send`. `vm/run` only with scripts allowed. Refused: `*`, `vm/exec` without a path, shorter paths (they match a namespace or every realm by prefix on chain), `bank/multisend`, anything else. At most 16, deduplicated |
| Spend | One `ugnot` amount. `amount × windows ≤ maximum`, where windows is 1 for `spend_period` 0 and otherwise `floor((expires_at − now + 300) / spend_period) + 1` |
| Expiry | In the future and at most 7 days away |
| Context | The current account must be a session master account, the network must support sessions, and both must match the request's `master_address` and `chain_id` |
| Key | `session_public_key`: base64 compressed secp256k1 (33 bytes) |

**Master account transactions** (`send_transaction`, `sign_transaction`):
only with **Allow master account requests** on; at most 32 messages of
`/vm.m_call`, `/vm.m_run`, `/vm.m_addpkg`, `/bank.MsgSend`; each message's
signer field is set to the wallet address, and any other address is refused;
each message passes Adena's message validators.

## Approval popups

| Request | Popup | Notes |
|---|---|---|
| `connect` | Connection (`ApproveEstablish`) | `reapprove`, so a connected name does not answer `ALREADY_CONNECTED` on its own; the popup reports the approved account |
| `create_session`, `revoke_session` | Transaction (`ApproveTransaction`) | Built by Adena (`MsgCreateSession` / `MsgRevokeSession`, gas priced by Adena); `commit`, so success means the transaction executed |
| `send_transaction` | Transaction (`ApproveTransaction`) | |
| `sign_transaction` | Sign (`ApproveSignTransaction`) | Signs only for the pinned account and network |

- The requester is shown as `<name>.agent` with protocol `agent:`.
- Popups carry the account id and network they were made for; a popup does
  not sign for another one, and the handler reports results only for the
  context it checked.
- Approvals are queued (at most 8) and shown one at a time. When its turn
  comes, a request is refused with `approval_pending` if another Adena popup
  (a dApp's, say) is open; agent requests never close other popups.
- A popup answer is accepted only from Adena's own extension pages, and an
  agent popup's only from that popup's window, so a content script or web
  page cannot answer it.
- A request whose popup URL would exceed the browser's limit is refused with
  `request_too_large`. Unanswered popups are closed after 10 minutes
  (`approval_timeout`), or when the agent cancels.

## Storage

`chrome.storage.local` can be edited by another process of the user while the
browser is closed, so what decides an agent's access is encrypted and
authenticated with the wallet's own key: XChaCha20-Poly1305 under the
Argon2id key of the wallet password and the wallet KDF salt, the same
construction as the vault.

| Key | Content | Protection |
|---|---|---|
| `AGENT_HOST_POLICY` | `{kind: 'agent-policy-v1', masterRequestsAllowed, maxSpendLimitUgnot, vmRunAllowed}` | Encrypted |
| `AGENT_HOST_CONNECTION_GRANTS` | `{kind: 'agent-grants-v1', grants}`: per `<account id>\|<site>`, token hash, pid, start | Encrypted; authoritative |
| `AGENT_HOST_CONNECTION_TOKENS` | The same grants in plain form | None; only used while locked, to answer `wallet_locked` instead of `not_connected` |
| `AGENT_HOST_ENABLED` | The connection switch | None |
| `AGENT_HOST_STATUS` (session storage) | Port status, error, the browser serving agents | Memory only |

- A record that is missing, does not decrypt, or has the wrong `kind` reads
  as the defaults: master requests off, 10 GNOT, scripts off, no grants.
- Decrypted records are cached in memory per ciphertext, so Argon2id runs
  once per record rather than per request.
- Reading the policy needs the password, so policy checks run once the wallet
  context has resolved (unlocked).
- A password change re-encrypts both records; if they cannot be opened they
  are dropped. A wallet reset deletes them. Writes are serialized with Web
  Locks across the service worker and pages.
- Rolling back to an older record the user saved is not detected.

## Keeping the master key safe

- **No key material leaves Adena.** The results of every agent request are
  limited to addresses, chain ids, RPC URLs, transaction hashes, signed
  transactions, settings and the connection token. Session keys are made by
  adena-mcp; Adena only sees their public keys.
- **Every master-key signature is approved by the user.** Session creation
  and revocation always open a popup; master account transactions are off by
  default and open a popup when allowed. There is no automatic approval.
- **Only the approved process can ask.** Requests that read the account or
  open a popup need the token issued to the calling process, checked
  against the encrypted grants.
- **Agents cannot widen their power.** The policy above is enforced inside
  Adena, where neither the agent nor the host can change it, and its stored
  values cannot be changed without the password.
- **Web pages cannot impersonate agents.** A page's request takes its
  protocol and hostname from the browser's sender information, and `agent:`
  is refused for pages. Page scripts cannot answer popups.
- **The wallet itself is unchanged:** it stays encrypted with the password
  (Argon2id, XChaCha20-Poly1305) and is decrypted only inside Adena, as for
  dApp requests.

What Adena cannot see: whether the host binary or adena-mcp was replaced by
another process of the user. The popup and the policy are the defense that
holds in that case; see
[Limits](../../misc/adena-mcp/docs/security.md#limits).

## Request methods

| Method | Connection | Popup | Result |
|---|---|---|---|
| `ping` | | | `version` |
| `get_status` | | | `version`, `has_wallet`, `connected`; for a connected agent `locked`, and while unlocked `master_requests_allowed`, `max_spend_limit`, `vm_run_allowed`, `chain_id`, `rpc_url` |
| `connect` | | connection | `address`, `chain_id`, `rpc_url`, `connection_token` |
| `get_account` | required | | `address`, `chain_id`, `rpc_url` |
| `create_session` | required | transaction | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url`, `expires_at` |
| `revoke_session` | required | transaction | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url` |
| `send_transaction` | required | transaction | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url` |
| `sign_transaction` | required | sign | `signed_tx`, `signer_address`, `chain_id` |
| `cancel` | host only | closes it | none |

Parameters are listed in
[misc/adena-mcp/docs/api.md](../../misc/adena-mcp/docs/api.md#adena-request-methods).

## Errors

`{ "id", "error": { "code", "message" } }` with `code`:

| Code | When |
|---|---|
| `invalid_request` / `invalid_params` | Malformed request or parameters |
| `policy_violation` | The session request breaks the agent policy |
| `no_wallet` | No wallet is set up |
| `not_connected` | The process holds no verified connection |
| `wallet_locked` | The wallet is locked |
| `master_requests_disabled` | Master account requests are off |
| `approval_pending` | Another Adena popup is open, or the queue is full |
| `approval_timeout` / `cancelled` | No answer in 10 minutes / the agent cancelled |
| `unsupported_account` / `unsupported_network` | The account or network cannot use sessions |
| `context_mismatch` | The account or network differs from the request's or changed meanwhile |
| `unidentified_agent` | The host could not identify the process |
| `request_too_large` | The popup URL would be too long |
| `rejected` | The user rejected the popup |
| `transaction_failed` | The transaction failed |
| `internal_error` | Anything else |

## Tests

```sh
npx vitest --run src/inject/agent-host src/inject/message src/services/wallet
```

The specs cover request parsing and the session policy (`agent-host-protocol`),
the encrypted policy and grants with a fast AEAD stand-in
(`agent-host-settings`) and once with the real Argon2id
(`agent-host-settings.argon2`), locked and unlocked connection states and
policy refusals (`agent-host-handler`), the host notification
(`agent-host-bridge`), the queue (`agent-approval-queue`), popup answers
(`methods/common`), sender identity, and Connected Apps removal.
