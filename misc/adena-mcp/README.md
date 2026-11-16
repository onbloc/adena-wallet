# adena-mcp

Lets an AI agent act on gno.land as an Adena user through
[session accounts](https://github.com/gnolang/gno/blob/master/gno.land/adr/adr-001-session-subaccounts.md).
The user approves every session and its revocation in Adena. The agent signs
with the session key through `gnokey` and never sees the master key.

```
AI agent ──MCP stdio──▶ adena-mcp ──unix socket──▶ adena-agent-host ◀──native messaging── Adena
                            │                                                              │
                            └── gnokey maketx ... --master <user> ──▶ gno.land ◀── session create/revoke
```

| App | Started by | Role |
|---|---|---|
| `apps/adena-mcp` | the agent (MCP client config) | MCP server. Holds the session keys in its own gnokey keybase and signs transactions. |
| `apps/adena-agent-host` | the browser, when Adena connects | Native messaging host. Relays requests between `~/.adena-agent/agent.sock` and Adena. |

The layout follows `onbloc/market-data-service`: `apps/<app>/cmd/<binary>`,
app-private `internal` packages, and shared packages in `pkg/`.

## Setup

Requires Go 1.25 and `gnokey` on `PATH`.

1. Build the binaries and register the host with the installed browsers
   (macOS and Linux):

   ```sh
   make build-all
   ./bin/adena-agent-host install
   # development builds of Adena have their own Chrome extension id:
   ./bin/adena-agent-host install -chrome-extension-id <unpacked-extension-id>
   ```

2. In Adena, turn on **Settings → Security & Privacy → AI Agent Connection**
   and grant the permission to communicate with native applications.

3. Add the MCP server to the agent, for example Claude Code:

   ```sh
   claude mcp add adena -- /absolute/path/to/bin/adena-mcp
   ```

`adena-agent-host uninstall` removes the host manifests.

## Tools

| Tool | What it does |
|---|---|
| `adena_status` | Adena connection, current account and network, held sessions |
| `adena_session_create` | Creates a key and asks the user to authorize it (`allow_paths`, `spend_limit`, `spend_period`, `expires_in`) |
| `adena_session_list` | Held sessions; `refresh` checks them on chain |
| `adena_call` / `adena_run` / `adena_send` | Signs `vm/exec`, `vm/run` or `bank/send` as the user |
| `adena_session_revoke` | Asks the user to revoke, then deletes the key |

Writes choose the newest usable session whose `allow_paths` cover the message.
Gas is measured by simulating first, then reserved at 1.5 times the gas used.
The fee is priced from `auth/gasprice`, because the chain charges the whole
offered fee against the session spend limit.

## Safety model

- The chain enforces each session's `allow_paths`, `spend_limit` and
  expiry. Sessions can never sign `auth/*` messages or deploy packages.
- Adena refuses `*` allow paths and requires `ugnot` in the spend limit. It
  also caps the lifetime at 7 days, because revoking needs the user. Expiry
  is the backstop if the agent never revokes.
- The socket and `~/.adena-agent` are owner-only. Any process running as the
  same user can reach the socket. It can only *ask*: every session and
  revocation still needs the user to approve it in Adena.
- Session keys and their keybase passwords are stored under
  `~/.adena-agent/mcp` (mode `0600`/`0700`). Their power is bounded by the
  session scope.

## Configuration

| Variable | Default | Meaning |
|---|---|---|
| `ADENA_AGENT_HOME` | `~/.adena-agent` | Socket and MCP data directory |
| `ADENA_MCP_GNOKEY` | `gnokey` | gnokey binary |
| `ADENA_MCP_APPROVAL_TIMEOUT` | `5m` | How long a tool waits for the user |
| `ADENA_MCP_GAS_CEILING` | `10000000` | Gas limit used when measuring a transaction |

## Protocol

The socket carries one JSON object per line. The host forwards each request
to Adena as a native messaging frame (32-bit native-endian length + JSON).
It also rewrites `id` so the response returns to the connection that asked.

```json
{"id":"1","method":"create_session","params":{"session_public_key":"<base64 33-byte secp256k1>","allow_paths":["vm/exec:gno.land/r/demo/counter"],"spend_limit":"5000000ugnot","expires_at":1800003600,"agent_name":"claude-code"}}
{"id":"1","result":{"tx_hash":"...","master_address":"g1...","chain_id":"...","expires_at":1800003600}}
{"id":"2","error":{"code":"rejected","message":"..."}}
```

Methods: `ping`, `get_account`, `create_session`, `revoke_session`.

## Development

```sh
make test   # go test -race ./...
make lint   # golangci-lint with .golangci.yaml
```
