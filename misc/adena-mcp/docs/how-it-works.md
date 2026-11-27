# How it works

adena-mcp lets an AI agent act on gno.land as the user of the Adena wallet
without ever holding the user's key. The agent works through
[session accounts](https://github.com/gnolang/gno/blob/master/gno.land/adr/adr-001-session-subaccounts.md):
scoped keys that the user authorizes once in Adena and that the chain lets
sign on the user's behalf (the transaction's caller is the user).

- [Components](#components)
- [Installation and upkeep](#installation-and-upkeep)
- [Connecting an agent](#connecting-an-agent)
- [Creating a session](#creating-a-session)
- [Signing with a session](#signing-with-a-session)
- [Signing with the wallet](#signing-with-the-wallet)
- [Revoking a session](#revoking-a-session)
- [Cancellation and timeouts](#cancellation-and-timeouts)
- [Several browsers](#several-browsers)

See [security.md](security.md) for what each step protects against and
[api.md](api.md) for the exact tools, messages and errors.

## Components

```
AI agent ──MCP stdio──▶ adena-mcp ──unix socket──▶ adena-agent-host ◀──native messaging── Adena (extension)
                            │                                                                 │
                            └──── session-signed tx (caller = user) ──▶ gno.land ◀──── session create / revoke
```

| Component | Started by | Holds | Role |
|---|---|---|---|
| `adena-mcp` | the AI client (MCP config) | session keys (memory only), the connection token | MCP server. Generates session keys, signs and broadcasts session transactions over RPC, asks Adena for approvals. |
| `adena-agent-host` | the browser, when Adena connects | nothing secret | Native messaging host. Listens on `~/.adena-agent/agent.sock`, identifies each connecting process from the OS, and relays requests to Adena. |
| Adena | the user | the wallet (master key) | Checks every request against the user's policy and the agent's connection, and shows the approval popups. Signs only what the user approves. |
| gno.land | | session accounts | Enforces each session's `allow_paths`, spend limit and expiry. |

On disk (`~/.adena-agent`, or `ADENA_AGENT_HOME`; owner-only):

| Path | Content |
|---|---|
| `agent.sock` | The host's Unix socket |
| `bin/adena-agent-host` | The host copy the browser manifests point at |
| `bin/agent-home` | The agent home recorded at install, for the browser-launched host |
| `extensions.json` | Extension ids allowed besides the store builds |
| `mcp/sessions.json` | Public session records (address, public key, scope). No keys |
| `native-messaging/` | Windows only: the manifests the `HKCU` keys point at |

## Installation and upkeep

`npx -y @adena-wallet/mcp@<version> setup` (or `install-host`, or the first
`connect_wallet`):

1. Copies `adena-agent-host` from the npm package to `~/.adena-agent/bin`, so
   the browser never runs a file from the npx cache. A running copy is
   renamed aside first (Windows cannot overwrite it).
2. Writes the native messaging manifest `xyz.onbloc.adena_agent` for every
   installed browser (Chrome, Chromium, Brave, Edge, Firefox), allowing the
   store builds of Adena and the ids in `extensions.json`. On Windows the
   manifest's path is also registered under the browser's `HKCU` key.
3. `setup` also adds the server to the AI clients it finds, pinned to the
   release.

Unpacked Adena builds are recognized only by their manifest name, so
`install` and `extensions detect` offer them and add only those the user
confirms. `connect_wallet` installs with the store builds and the listed ids
only.

Every `adena-mcp` start then keeps an existing installation current: it
replaces the host copy when the release is newer, and rewrites the manifests
from `extensions.json` (leaving identical ones untouched), which also covers
browsers installed since. It never installs the host on its own.

In Adena, the user turns on **Settings → Security & Privacy → AI Agent
Connection → Enable agent connection**. That requests the optional
`nativeMessaging` permission and makes the service worker call
`connectNative`, upon which the browser starts the host.

## Connecting an agent

1. `get_status` probes the socket. The MCP first checks that the process
   serving the socket is a host executable a browser manifest names, then
   sends the request (see [Socket and host checks](security.md#local-processes)).
2. `connect_wallet` sends `connect` with the agent name (the MCP client's
   name, e.g. `claude-code`).
3. The host attaches the caller's pid, start time and executable, read from
   the OS, replacing anything the client sent.
4. Adena refuses a process it cannot identify (`unidentified_agent`), then
   opens its connection popup showing `<agent name> (<executable>)`. The
   popup unlocks the wallet if needed.
5. On approval, Adena issues a random 32-byte token, stores its SHA-256 hash
   with the process's pid and start time (encrypted, see
   [Adena's storage](security.md#adenas-storage)), and returns the account,
   network and token. The agent appears under Connected Apps as
   `agent://<name>.agent`.
6. adena-mcp keeps the token in memory and attaches it to every later
   request. Requests that read the account or ask for an approval are
   refused unless the token was issued to that very process. A restarted
   server, or a second window of the same client, is a new process and is
   approved again.

## Creating a session

1. `create_session` refuses to start when the process could not harden
   itself (`key_protection_unavailable`).
2. adena-mcp generates the session key: 32 random bytes in locked memory, no
   mnemonic.
3. It sends Adena the public key with `allow_paths`, `spend_limit`,
   `spend_period`, `expires_at` and the account and chain it expects.
4. Adena checks the request against the user's policy, before any popup:
   - `allow_paths`: only `vm/exec:<full realm path>` and `bank/send`, plus
     `vm/run` if the user allows script sessions;
   - spend: the limit times the number of `spend_period` windows before
     expiry must not exceed the user's maximum (10 GNOT by default);
   - expiry: in the future and within 7 days;
   - the current account and chain must be the expected ones.
5. Adena builds `MsgCreateSession` with the master account as creator and
   opens the transaction popup. It waits for the block, so success means the
   transaction executed.
6. adena-mcp reads the session back from the chain and compares its key,
   scope, budget and expiry with the request. On a difference it destroys the
   key (`session_mismatch`, `session_not_found`); otherwise it keeps the key
   in memory and the public record in `sessions.json`.

## Signing with a session

`send_transaction` / `sign_transaction` with `signer: "session"` (the
default) open no popup:

1. adena-mcp picks the named session, or the newest usable one whose
   `allow_paths` cover every message. `/vm.m_addpkg` is refused
   (`wallet_signature_required`): sessions can never deploy.
2. It asks Adena whether this process is still connected (`get_status`
   with its token) and stops if not: `not_connected` once the user turned
   the agent connection off or removed the agent under Connected Apps,
   `adena_unreachable` while the browser or Adena is closed. The wallet may be
   locked. This pauses the sessions; it does not revoke them on chain.
3. It builds the messages with the user as caller and reads the session's
   account number and sequence from the chain.
4. It simulates at the gas ceiling, reserves 1.5× the gas used (at least
   100,000), and prices the fee from `auth/gasprice` (floor 1 ugnot per 1,000
   gas), because the chain charges the whole offered fee to the session.
5. It runs the chain's spend check locally, signs with the session key (the
   signature carries `session_addr`), and broadcasts with commit, or returns
   the signed transaction for `sign_transaction`.
6. The chain enforces the session's paths, spend limit and expiry again.

## Signing with the wallet

`signer: "wallet"` asks the user to sign with the master account:

1. Adena refuses unless the user turned on **Allow master account requests**
   (off by default).
2. Adena accepts only `/vm.m_call`, `/vm.m_run`, `/vm.m_addpkg` and
   `/bank.MsgSend`, and sets every signer field to the wallet address,
   refusing any other address.
3. The transaction popup (`send_transaction`) or the sign popup
   (`sign_transaction`) shows the request for the account and network the
   connection was checked for; if the user switched meanwhile, nothing is
   signed.

## Revoking a session

`revoke_session` sends Adena `MsgRevokeSession` for the session's public key,
on the account and chain that created it (`context_mismatch` otherwise). The
popup waits for the block; adena-mcp destroys the key only once the revoke is
reported committed on that chain (`revoke_unconfirmed` keeps it).
`forget_only` drops the record and key locally without a transaction. Users
can also revoke any session from Adena's Manage Sessions screen.

## Cancellation and timeouts

A tool waits up to `ADENA_MCP_APPROVAL_TIMEOUT` (5 minutes) for the user.
When it gives up, it closes its socket connection; the host then sends Adena
`cancel` for every request still open on it, and Adena closes the request's
popup or drops it from the queue. Adena itself gives up after 10 minutes.
Agent approvals are queued (at most 8) and shown one at a time. When its turn
comes, a request is refused with `approval_pending` if another Adena popup,
such as a dApp's, is open, so an agent never replaces a popup the user is
looking at.

## Several browsers

Each browser (or profile) with the agent connection on starts its own host,
but only one can serve the socket. A later host finds the socket live, tells
its Adena (`host_busy`, naming the browser that serves agents) and exits; that
Adena's settings screen shows the message. `get_status` names the browser
whose Adena answers.
