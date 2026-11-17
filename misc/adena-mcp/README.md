# adena-mcp

Lets an AI agent act on gno.land as an Adena user through
[session accounts](https://github.com/gnolang/gno/blob/master/gno.land/adr/adr-001-session-subaccounts.md).
The user approves every session and its revocation in Adena. adena-mcp signs
with the session key itself; the key has no seed phrase, never leaves locked
memory, and is never shown to the agent or anyone else.

```
AI agent ──MCP stdio──▶ adena-mcp ──unix socket──▶ adena-agent-host ◀──native messaging── Adena
                            │                                                              │
                            └── session-signed tx (caller = user) ──▶ gno.land ◀── session create/revoke
```

| App | Started by | Role |
|---|---|---|
| `apps/adena-mcp` | the agent (MCP client config) | MCP server. Generates session keys in locked memory, signs and broadcasts transactions over RPC. |
| `apps/adena-agent-host` | the browser, when Adena connects | Native messaging host. Relays requests between `~/.adena-agent/agent.sock` and Adena. |

The layout follows `onbloc/market-data-service`: `apps/<app>/cmd/<binary>`,
app-private `internal` packages, and shared packages in `pkg/`.

## Setup

With the published npm package (macOS and Linux, arm64 and x64):

```sh
claude mcp add --scope user adena -- npx -y @adena-wallet/mcp   # or install the plugin, see below
```

Then, in Adena, turn on **Settings → Security & Privacy → AI Agent Connection**,
and ask the agent to call `connect_wallet`. It installs the agent host on first
use, copying it to `~/.adena-agent/bin`, and allows only the store build of
Adena. `npx -y @adena-wallet/mcp install-host` does the same up front, and also
allows unpacked Adena builds it finds in Chromium profiles.

To build from source and connect a development build of Adena:

```sh
yarn build:module && yarn workspace adena-extension build   # repository root; load packages/adena-extension/dist unpacked
make build-all
./bin/adena-agent-host install     # also allows unpacked Adena builds found in Chromium profiles
claude mcp add adena -- /absolute/path/to/bin/adena-mcp
```

Load the unpacked build before running `install`, so its extension id is
detected. If the AI Agent Connection screen asks to reload Adena after the
permission prompt, reload it: a running service worker does not gain
`connectNative`.

`adena-agent-host uninstall` (or `npx -y @adena-wallet/mcp uninstall-host`)
removes the host manifests.

## Tools

| Tool | What it does |
|---|---|
| `get_status` | Host installed, Adena reachable, wallet present, unlocked and connected. Returns the account and sessions when ready, otherwise the next setup step |
| `connect_wallet` | Installs the host when missing and asks the user to approve the connection in Adena |
| `create_session` | Generates a session key and asks the user to authorize it (`allow_paths`, `spend_limit`, `spend_period`, `expires_in`) |
| `get_sessions` | Held sessions; `refresh` checks them on chain |
| `revoke_session` | Asks the user to revoke a session, then destroys its key |
| `send_transaction` | Signs and broadcasts one or more `/vm.m_call`, `/vm.m_run`, `/vm.m_addpkg`, `/bank.MsgSend` messages |
| `sign_transaction` | Same, but returns the signed transaction (base64 amino) without broadcasting |

`send_transaction` and `sign_transaction` sign with a session by default. The
session is the one named, or the newest usable session whose `allow_paths`
cover every message. `signer: "wallet"` sends the transaction to Adena for the
user to approve with the master account instead. `/vm.m_addpkg` always needs
the wallet, because sessions can never deploy packages. Wallet requests are
refused (`master_requests_disabled`) unless the user turns on **Allow master
account requests** on Adena's AI Agent Connection screen; it is off by default.
`get_status` reports it as `master_requests_allowed`.

For session signing, gas is measured by simulating first and reserved at 1.5
times the gas used. The fee is priced from `auth/gasprice`, because the chain
charges the whole offered fee against the session spend limit. The chain's
spend check runs before broadcasting.

The agent name sent to Adena is the MCP client's name, so each client is
connected (and listed under Connected Apps as `agent://<name>.agent`)
separately. Transaction and session requests are refused until the agent is
connected. A connection is bound to the executable that asked for it (see
below), so it has to be approved again after `adena-mcp` moves, for example
when npx fetches a new version.

Each `adena-mcp` process lists and uses only the sessions its client created.
Requests that open a popup in Adena are queued and shown one at a time. If an
approval times out, the agent closes it in Adena; check `get_sessions` or the
account's transactions before asking again.

## Plugins and other clients

`plugin/` packages the server with an `adena` skill for Claude Code, Codex,
Cursor and Gemini CLI. The root `.claude-plugin/marketplace.json` makes it
installable with:

```sh
claude plugin marketplace add onbloc/adena-wallet
claude plugin install adena@adena
```

Other clients run the same command, `npx -y @adena-wallet/mcp`:

| Client | Where |
|---|---|
| Codex CLI | `codex mcp add adena -- npx -y @adena-wallet/mcp`, or `[mcp_servers.adena]` in `~/.codex/config.toml` |
| Cursor | `mcpServers` in `~/.cursor/mcp.json` or `.cursor/mcp.json` |
| Claude Desktop | `mcpServers` in `claude_desktop_config.json` |
| Gemini CLI | `mcpServers` in `~/.gemini/settings.json` |
| Windsurf | `mcpServers` in `~/.codeium/windsurf/mcp_config.json` |
| VS Code | `servers` in `.vscode/mcp.json`, with `"type": "stdio"` |
| OpenCode | `mcp` in `opencode.json`: `{"type": "local", "command": ["npx", "-y", "@adena-wallet/mcp"], "enabled": true}` |

```json
{ "mcpServers": { "adena": { "command": "npx", "args": ["-y", "@adena-wallet/mcp"] } } }
```

Each client is connected to Adena separately. It shows up under Connected Apps
as `agent://<client name>.agent`.

### Troubleshooting

| Error | Fix |
|---|---|
| `Specified native messaging host not found.` | Run `install` (or `install-host`) again |
| `Access to the specified native messaging host is forbidden.` | The extension id is not allowed: reinstall after loading the build, or pass `-chrome-extension-id` |
| `adena_unreachable` | Open the browser, unlock Adena and turn on AI Agent Connection |
| `not_connected` | Call `connect_wallet` and approve it in Adena |
| `session_required` | Create a session with the `required_allow_paths` in the error, or use `signer: "wallet"` |
| `master_requests_disabled` | Use a session, or turn on *Allow master account requests* in Adena |
| `session_key_lost` | The server restarted; revoke the session and create a new one |
| `approval_pending` | Another approval is open in Adena; finish it, then retry |
| `policy_violation` | The session request breaks Adena's agent policy, e.g. a `spend_limit` above the maximum set on the AI Agent Connection screen |

## Safety model

- The chain enforces each session's `allow_paths`, `spend_limit` and
  expiry. Sessions can never sign `auth/*` messages or deploy packages.
- Adena refuses `*` allow paths. The spend limit must be a single `ugnot`
  amount no larger than the maximum the user sets on the AI Agent Connection
  screen (10 GNOT by default). It also caps the lifetime at 7 days, because
  revoking needs the user. Expiry is the backstop if the agent never revokes.
- The spend limit bounds GNOT only. Tokens and NFTs held by realms are moved
  by realm calls, so a session allowed to call a realm (or `vm/run`, or any
  realm through a bare `vm/exec`) can move them.
- The socket and `~/.adena-agent` are owner-only, and the host refuses peers
  running as another user. Any process running as the same user can reach the
  socket. It can only *ask*: every session and revocation still needs the
  user to approve it in Adena.
- The host attaches the peer's pid and executable path, read from the OS, to
  every request. Adena binds an agent's connection to that executable and
  shows it in the connection popup, so another program cannot reuse an
  agent's connection by sending its name.
- Web pages cannot use the `agent://` identity: Adena takes the identity of a
  web page's request from the browser, not from the page.
- Adena reports the lock state, network and settings only to a connected
  agent.

### Session keys

- A key is 32 random bytes generated directly in a
  [memguard](https://github.com/awnumar/memguard) buffer. No mnemonic is
  ever derived, so there is nothing to back up, export or recover.
- The buffer is mlocked, so it is never swapped. It has guard pages and lives
  outside the Go heap. While idle it is sealed into an enclave and kept
  encrypted in memory.
- Signing opens the enclave for one signature, then zeroes the scalar copy
  and destroys the buffer.
- Keys are never written to disk, logged, or returned by a tool. `sessions.json`
  holds only addresses, public keys and the approved scope. A `Key` formats,
  logs and serializes as its address.
- At startup the process disables core dumps. It also blocks inspection by
  other processes of the same user: on macOS `PT_DENY_ATTACH`, plus the
  hardened runtime the release binaries are signed with, which refuses
  `task_for_pid`; on Linux a cleared dumpable flag, so there is no ptrace and
  no `/proc/<pid>/mem`. Builds from source are not signed.
- Keys do not survive a restart. Their sessions show `key_held: false`, still
  revoke through Adena, and otherwise expire on chain.

Limits: root, the kernel, or a compromised adena-mcp binary can still read
memory while a key is in use. The signing library also makes short-lived
copies inside the elliptic-curve computation. The chain-enforced scope is
what bounds the damage in those cases.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ADENA_AGENT_HOME` | `~/.adena-agent` | Socket and MCP data directory |
| `ADENA_MCP_APPROVAL_TIMEOUT` | `5m` | How long a tool waits for the user |
| `ADENA_MCP_GAS_CEILING` | `10000000` | Gas limit used when measuring a transaction |

## Protocol

The socket carries one JSON object per line. The host forwards each request
to Adena as a native messaging frame (32-bit native-endian length + JSON).
It also rewrites `id` so the response returns to the connection that asked,
and sets `peer` (`pid`, `exe`) from the OS, replacing anything the client
sent. When a connection closes with requests still open, the host sends Adena
`{"method":"cancel","params":{"request_id":"<host id>"}}` for each; clients
cannot send `cancel` themselves. A client that stops reading its responses is
disconnected.

```json
{"id":"1","method":"create_session","params":{"session_public_key":"<base64 33-byte secp256k1>","allow_paths":["vm/exec:gno.land/r/demo/counter"],"spend_limit":"5000000ugnot","expires_at":1800003600,"agent_name":"claude-code"}}
{"id":"1","result":{"tx_hash":"...","master_address":"g1...","chain_id":"...","expires_at":1800003600}}
{"id":"2","error":{"code":"rejected","message":"..."}}
```

Methods: `ping`, `get_status`, `connect`, `get_account`, `create_session`,
`revoke_session`, `send_transaction`, `sign_transaction`, and `cancel` (host
only).

## Development

```sh
make test                                   # go test -race ./...
make lint                                   # golangci-lint with .golangci.yaml
make npm-pack NPM_VERSION=0.0.0-local       # npm packages and tarballs in npm/dist
```

## Releasing to npm

Bump the plugin manifests and the version pinned in `plugin/.mcp.json`,
`plugin/mcp.json` and `plugin/gemini-extension.json` to the release version,
then push a tag `adena-mcp-v<version>` (for example `adena-mcp-v0.1.0`). The
`adena-mcp-npm` workflow tests and builds the platform packages and the
`@adena-wallet/mcp` launcher on macOS, signing the macOS binaries with the
hardened runtime, and fails if the plugin files do not pin that version. A
separate job publishes them with the `NPM_TOKEN` secret of the `npm-release`
environment; give that environment required reviewers. Run manually, the
workflow builds only, and publishes only from `main` when asked to.
