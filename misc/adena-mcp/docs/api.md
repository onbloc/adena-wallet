# API reference

- [MCP tools](#mcp-tools)
- [Messages](#messages)
- [Tool errors](#tool-errors)
- [Commands](#commands)
- [Configuration](#configuration)
- [Socket protocol](#socket-protocol)
- [Native messaging protocol](#native-messaging-protocol)
- [Adena request methods](#adena-request-methods)
- [Protocol errors](#protocol-errors)

## MCP tools

Each tool returns text and structured content; failures are tool errors with
a code and a repair hint ([Tool errors](#tool-errors)).

### `get_status`

No input. Reports whether the agent can use Adena.

| Field | Meaning |
|---|---|
| `state` | `host_not_installed`, `host_untrusted`, `adena_unreachable`, `no_wallet`, `not_connected`, `locked` or `ready` |
| `next_step` | What to do, until `ready`. Includes `hints` such as unallowed Adena builds found in the browsers |
| `host_installed`, `reachable`, `has_wallet`, `connected`, `adena_version` | Setup facts |
| `agent_name` | The name sent to Adena (the MCP client's name) |
| `browser`, `extension_id` | The browser and Adena build serving the agent, when known |
| `key_protection` | `{full, problems, allow_unhardened}`: whether this process could harden itself |
| `locked`, `master_requests_allowed`, `max_spend_limit`, `vm_run_allowed` | Only for a connected agent; the policy fields only while the wallet is unlocked |
| `account` | `{address, chain_id, rpc_url}`, when ready |
| `sessions` | This agent's sessions, when ready (fields as in `get_sessions`) |

### `connect_wallet`

No input. Installs the host when missing, then asks the user to approve the
connection in Adena (unlocking it if needed). Returns `state`, `connected`,
`agent_name` and `account` `{address, chain_id, rpc_url}`, or `next_step` when
Adena is not reachable yet. Idempotent for a connected process.

### `create_session`

| Input | Default | Meaning |
|---|---|---|
| `allow_paths` (required) | | 1 to 8 entries: `vm/exec:<full realm path>`, `bank/send`; `vm/run` only if `vm_run_allowed` |
| `spend_limit` | `5000000ugnot`, or the user's maximum if lower | One ugnot amount per period, gas included |
| `spend_period` | `0` | Seconds after which the limit resets; `0` makes it a cap for the whole session. The total over the lifetime must stay within `max_spend_limit` |
| `expires_in` | `1h` | Go duration, at most `168h` |

Blocks until the user decides. Returns the session record: `session_address`,
`master_address`, `chain_id`, `rpc_url`, `allow_paths`, `spend_limit`,
`spend_period`, `expires_at`, `status`, `key_held`, `usable`, `tx_hash`.

### `get_sessions`

| Input | Meaning |
|---|---|
| `refresh` | Look each session up on chain; ones the chain no longer holds are marked `revoked`, and each entry gets `on_chain` |

Returns `sessions`: this agent's records (fields as above). `key_held` is
whether this process holds the key; `usable` whether it can sign now.

### `revoke_session`

| Input | Meaning |
|---|---|
| `session_address` (required) | The session to revoke |
| `forget_only` | Drop the record and key locally, without a transaction |

Asks the user to approve `MsgRevokeSession` on the session's account and
chain, then destroys the key. Works for sessions whose key was lost. Returns
`session_address`, `revoked`, `tx_hash`.

### `send_transaction` / `sign_transaction`

| Input | Meaning |
|---|---|
| `messages` (required) | One or more [messages](#messages), signed together |
| `memo` | Transaction memo |
| `signer` | `session` (default) or `wallet` |
| `session_address` | Session to sign with; default the newest usable one covering every message |
| `gas_wanted` | Gas limit; default measured by simulation (session) or set in Adena (wallet) |
| `gas_fee` | Fee such as `10000ugnot`; default priced from `auth/gasprice` |
| `simulate` | `send_transaction` only: simulate with the session, broadcast nothing |

| Result | Session | Wallet |
|---|---|---|
| `send_transaction` | `signer`, `session_address`, `master_address`, `chain_id`, `gas_wanted`, `gas_fee`, `tx_hash`, `height`, `gas_used`, `result` (`simulated` instead of the hash when simulating) | `signer`, `tx_hash`, `height`, `master_address`, `chain_id` |
| `sign_transaction` | the same plus `signed_tx` (base64 amino), not broadcast | `signer`, `signed_tx`, `signer_address`, `chain_id` |

With a session, nothing is signed unless Adena reports this process as still
connected (`not_connected`, `adena_unreachable` otherwise).
`/vm.m_addpkg` needs `signer: "wallet"`. `signer: "wallet"` needs **Allow
master account requests** in Adena.

## Messages

Adena's message format. Signer fields (`caller`, `creator`, `from_address`)
may be omitted; they are set to the wallet address, and any other address is
refused.

```json
{"type": "/vm.m_call", "value": {"pkg_path": "gno.land/r/demo/counter", "func": "Incr", "args": [], "send": "", "max_deposit": ""}}
{"type": "/vm.m_run", "value": {"send": "", "package": {"name": "main", "path": "", "files": [{"name": "main.gno", "body": "package main\n\nfunc main() {}\n"}]}}}
{"type": "/vm.m_addpkg", "value": {"package": {"name": "foo", "path": "gno.land/p/<namespace>/foo", "files": [{"name": "foo.gno", "body": "..."}]}, "send": "", "max_deposit": ""}}
{"type": "/bank.MsgSend", "value": {"to_address": "g1...", "amount": "1000000ugnot"}}
```

At most 32 messages per transaction. A request line, including package
sources, must stay under 1 MiB.

## Tool errors

| Code | Meaning and fix |
|---|---|
| `adena_unreachable` | No host on the socket; call `get_status` for setup steps. Sessions do not sign meanwhile |
| `host_untrusted` | Another program serves the socket; stop it and reinstall the host |
| `host_install_failed` | `connect_wallet` could not install; run `npx -y @adena-wallet/mcp setup` |
| `not_connected` | This process is not connected, or no longer is (the user turned the agent connection off or removed the agent); sessions are paused. Ask the user before calling `connect_wallet` |
| `wallet_locked` | Ask the user to unlock Adena |
| `user_rejected` | The user rejected it in Adena |
| `approval_timeout` | No answer in time; the request was cancelled in Adena. Check before asking again |
| `approval_pending` | Another Adena popup is open; retry after the user finishes it |
| `extension_disconnected` | Adena closed the channel while a request was open; its outcome is unknown |
| `context_mismatch` | Adena is on another account or network than the request or session |
| `master_requests_disabled` | `signer: "wallet"` is turned off by the user |
| `policy_violation` | The session request breaks Adena's agent policy (paths, total spend, lifetime) |
| `key_protection_unavailable` | This process could not harden itself, so it makes no keys (`key_protection` in `get_status`) |
| `session_mismatch` | The approved session differs from the request; the key was destroyed. Revoke it |
| `session_not_found` | Adena reported success but no session for this key exists; the key was destroyed |
| `session_required` | No held session covers the messages; `required_allow_paths` lists what to ask for |
| `session_unknown` | This process holds no such session |
| `session_key_lost` | The server restarted; revoke and create a new session |
| `session_expired` | The session is revoked or expired |
| `session_scope` | The chain refused the session for this transaction |
| `session_spend_limit` | The transaction would exceed the session's spend limit |
| `wallet_signature_required` | The message (`/vm.m_addpkg`) cannot be signed by a session |
| `revoke_unconfirmed` | The revoke was not reported committed on the session's chain; the key is kept |
| `transaction_failed` | The chain or Adena reported a failed transaction |
| `invalid_argument` | A tool argument is malformed |

## Commands

`npx -y @adena-wallet/mcp@<version> <command>`:

| Command | What it does |
|---|---|
| (none) | Runs the MCP server over stdio |
| `setup [--clients a,b] [--no-clients] [--dry-run] [--force] [-- <install flags>]` | Installs the host and registers the server with the AI clients found: `claude`, `codex`, `cursor`, `gemini`, `claude-desktop`, `windsurf`, `opencode` |
| `install-host [<install flags>]` | Installs the host only |
| `uninstall-host` | Removes the browser registrations and the host copy |
| `extensions [list]` | Lists the allowed extension ids and unallowed Adena builds found |
| `extensions add <id>... \| add -path <dir>` | Allows a Chromium id (32 letters a-p), a Firefox add-on id, or an unpacked build directory (not on Windows) |
| `extensions remove <id>...` | Removes an id; the store builds cannot be removed |
| `extensions detect [-allow]` | Offers each unpacked Adena build found in Chromium profiles |
| `help`, `version` | |

Install flags (`adena-agent-host install`): `-chrome-extension-id <id>`,
`-firefox-extension-id <id>`, `-extension-path <dir>` (repeatable, kept in
the list), `-detect=false` (skip detection), `-allow-detected` (allow every
detected build without asking).

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ADENA_AGENT_HOME` | `~/.adena-agent` | Socket and data directory. Recorded next to the installed host, since the browser does not pass the MCP client's environment |
| `ADENA_MCP_APPROVAL_TIMEOUT` | `5m` | How long a tool waits for the user |
| `ADENA_MCP_GAS_CEILING` | `10000000` | Gas limit used to measure a transaction |
| `ADENA_MCP_ALLOW_UNHARDENED` | unset | `1` lets `create_session` make keys although hardening is incomplete |
| `ADENA_MCP_SKIP_HOST_CHECK` | unset | `1` lets a host no manifest names serve the socket (debugging) |
| `ADENA_AGENT_HOST_BIN` | next to `adena-mcp` | The host binary `connect_wallet` installs |
| `ADENA_MCP_BIN_DIR` | the platform package | Where the npm launcher finds the binaries |

## Socket protocol

`~/.adena-agent/agent.sock` carries one JSON object per line, at most 1 MiB
per request. Each `adena-mcp` call opens its own connection.

```json
{"id":"<client id>","method":"<method>","params":{...},"token":"<connection token>"}
{"id":"<client id>","result":{...}}
{"id":"<client id>","error":{"code":"<code>","message":"<text>"}}
```

The host:

- answers `host_info` itself: `{"version","browser","extension_id"}`;
- refuses `cancel` from clients;
- forwards everything else to Adena with `id` rewritten to its own and
  `peer` (`pid`, `start`, `exe`) set from the OS, replacing what the client
  sent, and routes the response back with the client's `id`;
- allows 32 connections and 16 requests in flight per connection, and drops a
  client that does not read its responses for 5 seconds;
- when a connection closes with requests open, sends Adena
  `{"method":"cancel","params":{"request_id":"<host id>"}}` for each;
- when the browser closes the channel, fails open requests with
  `extension_disconnected` and exits.

Before writing a request, `adena-mcp` checks that the socket's serving process
runs as the same user and is a host executable a browser manifest names.

## Native messaging protocol

Host name `xyz.onbloc.adena_agent`, type `stdio`. Frames are a 32-bit
native-endian length followed by JSON: up to 1 MiB from the host, up to
4 MiB accepted from the browser. Requests are the socket requests with the
host's id and `peer`; responses are `{id, result}` or `{id, error}`.

A host that finds another browser already serving the socket sends one
notification and exits:

```json
{"event":"host_busy","browser":"<name of the browser serving agents>"}
```

## Adena request methods

`agent_name` (lowercased to `[a-z0-9-]`, at most 32 characters) identifies
the agent in every request. Methods other than `ping`, `get_status` and
`connect` need the connection token issued to the calling process.

| Method | Params | Result | Popup |
|---|---|---|---|
| `ping` | | `version` | |
| `get_status` | `agent_name` | `version`, `has_wallet`, `connected`; for a connected agent `locked`, and while unlocked `master_requests_allowed`, `max_spend_limit`, `vm_run_allowed`, `chain_id`, `rpc_url` | |
| `connect` | `agent_name` | `address`, `chain_id`, `rpc_url`, `connection_token` | connection |
| `get_account` | `agent_name` | `address`, `chain_id`, `rpc_url` | |
| `create_session` | `agent_name`, `session_public_key` (base64 33-byte compressed secp256k1), `allow_paths`, `spend_limit`, `spend_period`, `expires_at` (unix seconds), `master_address`, `chain_id` | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url`, `expires_at` | transaction (waits for the block) |
| `revoke_session` | `agent_name`, `session_public_key`, `master_address`, `chain_id` | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url` | transaction (waits for the block) |
| `send_transaction` | `agent_name`, `messages`, `memo`, `gas_wanted`, `gas_fee` | `tx_hash`, `height`, `master_address`, `chain_id`, `rpc_url` | transaction |
| `sign_transaction` | same | `signed_tx`, `signer_address`, `chain_id` | sign |
| `cancel` | `request_id` (host only) | none | closes that request's popup |

```json
{"id":"1","method":"create_session","params":{"agent_name":"claude-code","session_public_key":"<base64>","allow_paths":["vm/exec:gno.land/r/demo/counter"],"spend_limit":"5000000ugnot","expires_at":1800003600,"master_address":"g1...","chain_id":"test13"},"token":"<token>","peer":{"pid":4242,"start":"1800000000.123","exe":"/path/to/adena-mcp"}}
{"id":"1","result":{"tx_hash":"...","height":"7","master_address":"g1...","chain_id":"test13","rpc_url":"https://...","expires_at":1800003600}}
```

## Protocol errors

From the host:

| Code | Meaning |
|---|---|
| `host_unavailable` | Nothing listens on the socket (reported by the client) |
| `host_untrusted` | The socket is served by another program (reported by the client) |
| `invalid_request` | Malformed line, or `cancel` from a client |
| `too_many_requests` | 16 requests already in flight on the connection |
| `request_too_large` | A line or frame over its limit |
| `extension_disconnected` | The browser closed the channel |

From Adena: `invalid_request`, `invalid_params`, `policy_violation`,
`no_wallet`, `not_connected`, `wallet_locked`, `master_requests_disabled`,
`approval_pending`, `approval_timeout`, `cancelled`, `unsupported_account`,
`unsupported_network`, `context_mismatch`, `unidentified_agent`,
`request_too_large`, `rejected`, `transaction_failed`, `internal_error`.
