# adena-mcp

Lets an AI agent act on gno.land as an Adena user through
[session accounts](https://github.com/gnolang/gno/blob/master/gno.land/adr/adr-001-session-subaccounts.md).
The user approves every session, and its revocation, in Adena; the master key
never leaves Adena. adena-mcp signs with the session key itself; the key has
no seed phrase, never leaves locked memory, and is never shown to the agent or
anyone else.

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
app-private `internal` packages, and shared packages in `pkg/` (`bridge`,
`nativemsg`, `peercred`, `hostinstall`, `agentpath`). The extension side is
described in [packages/adena-extension/AGENT-HOST.md](../../packages/adena-extension/AGENT-HOST.md).

| Document | Covers |
|---|---|
| [docs/how-it-works.md](docs/how-it-works.md) | Installation, connecting, sessions, signing, revoking, cancellation |
| [docs/security.md](docs/security.md) | Threat model, how keys and tokens are kept from leaking, the agent policy, platform hardening, limits |
| [docs/api.md](docs/api.md) | MCP tools, messages, errors, commands, configuration, socket and native messaging protocols |

## Setup

With the published npm package (macOS, Linux and Windows, arm64 and x64), one
command sets up the machine:

```sh
npx -y @adena-wallet/mcp@<version> setup
```

It copies the agent host to `~/.adena-agent/bin`, registers it with every
installed browser, and adds the server, pinned to that version, to the AI
clients it finds: Claude Code and Codex through their CLIs, Cursor, Gemini
CLI, Claude Desktop, Windsurf and OpenCode through their JSON configs (a file
that is not plain JSON is left alone, and an existing `adena` entry is kept
unless `--force`). `--clients claude,cursor` picks clients, `--no-clients`
only installs the host, `--dry-run` shows what would change. Then:

1. In Adena, turn on **Settings → Security & Privacy → AI Agent Connection**
   (reload Adena if the screen asks: a running service worker does not gain
   `connectNative`).
2. Restart the AI client and ask it to connect the Adena wallet. Approve the
   connection in Adena.

Without `setup`, add the server by hand (see [Plugins and other clients](#plugins-and-other-clients));
`connect_wallet` installs the host on first use.

Every `adena-mcp` start keeps the installation current: it upgrades the host
copy in `~/.adena-agent/bin` when the release is newer, and rewrites the
browser manifests from the allowed extension list, which also covers browsers
installed since. It never installs the host on its own.

To build from source and connect a development build of Adena:

```sh
pnpm build:module && pnpm build:service   # repository root; load packages/adena-extension/dist unpacked
make build-all
./bin/adena-agent-host install     # offers the unpacked Adena builds it finds; confirm yours
claude mcp add adena -- /absolute/path/to/bin/adena-mcp
```

Load the unpacked build before running `install`, so its extension id is
detected.

`adena-agent-host uninstall` (or `npx -y @adena-wallet/mcp uninstall-host`)
removes the host manifests.

### Allowed Adena builds

The store builds of Adena (Chrome Web Store id `oefglhbffgfkcpboeackfgdagmlnihnh`,
Firefox `adena-wallet@onbloc.xyz`) may always start the host. Any other build,
such as an unpacked development build, must be added to the list in
`~/.adena-agent/extensions.json`, which installs, upgrades and every
`adena-mcp` start apply to the browser manifests:

```sh
npx -y @adena-wallet/mcp extensions                 # list allowed ids and unallowed Adena builds found
npx -y @adena-wallet/mcp extensions add <id>         # Chromium id (32 letters a-p) or Firefox add-on id
npx -y @adena-wallet/mcp extensions add -path <dir>  # unpacked build directory
npx -y @adena-wallet/mcp extensions remove <id>
npx -y @adena-wallet/mcp extensions detect [-allow]  # offer each unpacked Adena build found in Chromium profiles
```

A build is recognized only by its manifest name, so detected builds are never
allowed without an answer: `install` and `extensions detect` ask on a
terminal, and otherwise print the `extensions add` command (`-allow-detected`
/ `-allow` accept them all). `connect_wallet` installs with the store builds
and the listed ids only. When Adena is unreachable, `get_status` names Adena
builds found in the browsers that are not allowed yet.

## Tools

| Tool | What it does |
|---|---|
| `get_status` | Setup state and the next step; when ready, the account, sessions and the user's policy |
| `connect_wallet` | Installs the host when missing and asks the user to approve the connection in Adena |
| `create_session` | Generates a session key and asks the user to authorize it, then checks it on chain against the request |
| `get_sessions` | This agent's sessions; `refresh` checks them on chain |
| `revoke_session` | Asks the user to revoke a session, then destroys its key |
| `send_transaction` | Signs and broadcasts `/vm.m_call`, `/vm.m_run`, `/vm.m_addpkg`, `/bank.MsgSend` messages |
| `sign_transaction` | Same, but returns the signed transaction without broadcasting |

Transactions are signed with a session by default, without a popup.
`signer: "wallet"` asks the user to sign with the master account in Adena;
it needs **Allow master account requests** (off by default) and is the only
way to deploy (`/vm.m_addpkg`). Inputs, results and errors are in
[docs/api.md](docs/api.md).

## Plugins and other clients

`plugin/` packages the server with an `adena` skill for Claude Code, Codex,
Cursor and Gemini CLI. The root `.claude-plugin/marketplace.json` makes it
installable with:

```sh
claude plugin marketplace add onbloc/adena-wallet
claude plugin install adena@adena
```

Other clients run the same command, `npx -y @adena-wallet/mcp@<version>`. Pin
the version, so a later publish does not run until you update; `setup` does
this for you:

| Client | Where |
|---|---|
| Codex CLI | `codex mcp add adena -- npx -y @adena-wallet/mcp@<version>`, or `[mcp_servers.adena]` in `~/.codex/config.toml` |
| Cursor | `mcpServers` in `~/.cursor/mcp.json` or `.cursor/mcp.json` |
| Claude Desktop | `mcpServers` in `claude_desktop_config.json` |
| Gemini CLI | `mcpServers` in `~/.gemini/settings.json` |
| Windsurf | `mcpServers` in `~/.codeium/windsurf/mcp_config.json` |
| VS Code | `servers` in `.vscode/mcp.json`, with `"type": "stdio"` |
| OpenCode | `mcp` in `opencode.json`: `{"type": "local", "command": ["npx", "-y", "@adena-wallet/mcp@<version>"], "enabled": true}` |

```json
{ "mcpServers": { "adena": { "command": "npx", "args": ["-y", "@adena-wallet/mcp@<version>"] } } }
```


Each client is connected to Adena separately. It shows up under Connected Apps
as `agent://<client name>.agent`.

### Troubleshooting

| Error | Fix |
|---|---|
| `Specified native messaging host not found.` | Run `setup` (or `install-host`) again |
| `Access to the specified native messaging host is forbidden.` | The extension id is not allowed: `npx -y @adena-wallet/mcp extensions add <id>` |
| `host_untrusted` | Another program serves `~/.adena-agent/agent.sock`. Stop it and run `install-host` again |
| `key_protection_unavailable` | This process could not protect session keys (see `key_protection` in `get_status`). Restart the server; `ADENA_MCP_ALLOW_UNHARDENED=1` accepts the risk |
| `session_mismatch` / `session_not_found` | The session on chain differs from the request, or is missing: the request was changed on its way to Adena. The key is destroyed; revoke unknown sessions in Adena > Manage Sessions and reinstall the host |
| `adena_unreachable` | Open the browser, unlock Adena and turn on AI Agent Connection |
| `not_connected` | Call `connect_wallet` and approve it in Adena |
| `session_required` | Create a session with the `required_allow_paths` in the error, or use `signer: "wallet"` |
| `master_requests_disabled` | Use a session, or turn on *Allow master account requests* in Adena |
| `session_key_lost` | The server restarted; revoke the session and create a new one |
| `approval_pending` | Another approval is open in Adena; finish it, then retry |
| `unidentified_agent` | The agent host could not read this process's identity from the OS; connections need it |
| `context_mismatch` | Adena is on another account or network than the session; switch back, then retry |
| `revoke_unconfirmed` | Adena did not report the revoke as committed on the session's network; the key is kept. Check `get_sessions` with `refresh` |
| `request_too_large` | A request, usually a package deployment, is over the 1 MiB protocol limit |
| `policy_violation` | The session request breaks Adena's agent policy: a total spend (spend limit × periods) above the maximum set on the AI Agent Connection screen, a path broader than one realm, `vm/run` while script sessions are off, `bank/multisend` or `*` |
| Adena says another browser serves agents | Only one browser at a time can serve the socket. Close the other one, or turn off AI Agent Connection there, then reload Adena |

## Windows

The host and MCP server run on Windows 10 (1803) or later, which provide the
Unix domain sockets the two use.

- `install` writes the manifests under `native-messaging` in the agent home
  (`%USERPROFILE%\.adena-agent`, or `ADENA_AGENT_HOME`). It registers each one
  under the browser's
  `HKCU\Software\<browser>\NativeMessagingHosts\xyz.onbloc.adena_agent` key.
- Unpacked builds are detected from the profiles under `%LOCALAPPDATA%` and
  `%APPDATA%`, so redirected profiles are found. `-extension-path` is not
  supported, because the extension id cannot be computed from the path there.
- The agent home gets a protected ACL that grants access to the current user
  and SYSTEM only, in place of permission bits. Its socket and `sessions.json`
  inherit it, wherever `ADENA_AGENT_HOME` points. A directory owned by another
  account is taken over first, because an owner can always rewrite the ACL;
  if that is not possible, adena-mcp refuses to use it. The host's `bin`
  directory gets the same treatment. Anything inside the home that another
  account owns, such as a planted `native-messaging` manifest or a socket, is
  removed (adena-mcp and the installer recreate all of it), because an owner
  keeps control of its own files and can reach them by path through a
  directory it can no longer list.
- The host identifies each peer with `SIO_AF_UNIX_GETPEERPID` and refuses
  processes of other users, as on macOS and Linux.
- Process hardening is weaker than on macOS and Linux. adena-mcp sets a
  process DACL that lets other processes of the user only wait for, query and
  stop it, and an OWNER RIGHTS entry keeps them from changing that DACL back.
  An administrator, or any process with `SeDebugPrivilege` enabled, can still
  read its memory and with it the session keys. There is no core dump control
  yet. Sign with sessions whose scope you could afford to lose.
- A running host executable cannot be overwritten, so reinstalling moves it to
  a unique `.old.<n>` name first. Retired copies are removed by a later install
  once no host runs them.

## Safety model

In short (details in [docs/security.md](docs/security.md)):

- Adena signs with the master key only after the user approves a popup, and
  no agent request returns key material. Master account requests are off by
  default.
- Session keys exist only in adena-mcp's hardened, locked memory, are never
  stored or shown, and are wiped when destroyed. adena-mcp refuses to make
  keys if it cannot harden itself.
- Adena enforces the agent policy before any popup: one realm per `vm/exec`
  entry, `bank/send`, `vm/run` only if the user allows scripts, a total GNOT
  budget within the user's maximum (10 GNOT by default), at most 7 days. The
  chain enforces each session's scope, budget and expiry.
- A connection is bound to the approved process, identified from the OS.
  Turning the agent connection off stops adena-mcp from signing with its
  sessions, but only revocation (Adena's Manage Sessions) or expiry ends
  them on chain.
  Adena keeps the policy and grants encrypted with the wallet password.
- A prompt-injected agent that runs shell commands is a process of the same
  user: it cannot read keys, but it can change files the user owns. Read each
  approval, and run the agent in its sandbox; see
  [Limits](docs/security.md#limits) and
  [Recommendations](docs/security.md#recommendations).

## Configuration

Environment variables (`ADENA_AGENT_HOME`, `ADENA_MCP_APPROVAL_TIMEOUT`,
`ADENA_MCP_GAS_CEILING`, `ADENA_MCP_ALLOW_UNHARDENED`, ...) are listed in
[docs/api.md](docs/api.md#configuration).

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
environment; give that environment required reviewers. The workflow's actions
are pinned to commit SHAs. Moving to npm trusted publishing (OIDC) would drop
the long-lived token; it needs the publisher configured on npmjs.com first. Run manually, the
workflow builds only, and publishes only from `main` when asked to.
