# Security

What adena-mcp, the agent host and Adena guarantee, against whom, and where
the guarantees end. [how-it-works.md](how-it-works.md) describes the flows
referred to here.

- [Summary](#summary)
- [Threat model](#threat-model)
- [Keys and secrets](#keys-and-secrets)
  - [The master key (Adena)](#the-master-key-adena)
  - [Session keys (adena-mcp)](#session-keys-adena-mcp)
  - [The connection token](#the-connection-token)
  - [Stopping an agent](#stopping-an-agent)
- [What limits an agent](#what-limits-an-agent)
- [Local processes](#local-processes)
- [Web pages and other extensions](#web-pages-and-other-extensions)
- [Adena's storage](#adenas-storage)
- [Platform hardening](#platform-hardening)
- [Limits](#limits)
- [Recommendations](#recommendations)

## Summary

- **The master key never leaves Adena.** No request an agent can make
  returns key material. Every master-account signature, and every session
  creation and revocation, is approved by the user in an Adena popup.
- **Session keys never leave adena-mcp's memory.** They are generated in
  locked memory without a mnemonic, never written to disk, logged or returned
  by a tool, and wiped when destroyed. The process refuses debuggers and
  memory reads by other processes of the user, and refuses to create keys if
  it cannot.
- **What a session may do is enforced by Adena and the chain**, not by the
  agent: one realm per `vm/exec` entry, `bank/send`, `vm/run` only if the
  user allows scripts, a total GNOT budget within the user's maximum, and at
  most 7 days.
- **An approved agent is one process.** Its token works only from the process
  it was issued to, as the operating system identifies it.

## Threat model

| Actor | Can | Cannot |
|---|---|---|
| The AI agent, including one steered by prompt injection | Call every tool; ask for sessions, revocations and (if allowed) master signatures; sign with a session it holds within that session's scope | Get the master key or a session key; widen a session; exceed the user's policy; sign as the master account without the user's approval |
| Another process of the same user | Connect to the socket and ask for a connection (the user sees the program in the popup); change files the user owns (see [Limits](#limits)) | Use another process's connection; read a hardened adena-mcp's memory; make Adena sign without a popup |
| Another user of the machine | | Reach the socket, `~/.adena-agent`, or the processes (owner-only files, peer user checks) |
| A web page | Use Adena as a dApp, as before | Claim an agent identity; answer an approval popup |
| Another extension | | Talk to Adena's background or start the host (native messaging allows only Adena's ids) |
| An RPC node | Refuse or delay transactions, report wrong data | Forge a signature or alter a signed transaction |

Out of scope: root, the kernel, a compromised browser,
and a compromised Adena or adena-mcp release.

## Keys and secrets

### The master key (Adena)

- The wallet is stored as Adena always stores it: encrypted with a key derived
  from the user's password (Argon2id, XChaCha20-Poly1305). Agent support adds
  no new copy, export path or storage of key material.
- The agent requests Adena handles (`get_status`, `connect`, `get_account`,
  `create_session`, `revoke_session`, `send_transaction`, `sign_transaction`)
  return only addresses, chain ids, RPC URLs, transaction hashes, signed
  transactions, settings and the connection token. None returns a private
  key, mnemonic or password.
- Nothing is signed with the master key without a popup:
  - session creation and revocation open the transaction popup;
  - `send_transaction` and `sign_transaction` (signer `wallet`) open the
    transaction or sign popup, and are refused before any popup unless the
    user turned on **Allow master account requests** (off by default);
  - only `/vm.m_call`, `/vm.m_run`, `/vm.m_addpkg` and `/bank.MsgSend` are
    accepted, and their signer fields must be the wallet's own address.
- A request acts only for the account and network the connection was checked
  for; if the user switches meanwhile, it fails with `context_mismatch` and
  nothing is signed.
- Approvals are queued and never replace a popup the user is looking at.

### Session keys (adena-mcp)

- **Generation:** 32 random bytes directly in a
  [memguard](https://github.com/awnumar/memguard) buffer: mlocked (never
  swapped), guard pages, outside the Go heap. No mnemonic is derived, so there
  is nothing to back up, export or recover.
- **At rest in memory:** the key is masked with a per-key random pad kept in
  its own locked buffer, and the masked key is sealed in an enclave (encrypted
  while idle).
- **Signing** opens the enclave for one signature, unmasks into a locked
  buffer, signs, and zeroes and destroys every copy.
- **Destroying** a key (revocation, rejection, shutdown) destroys its pad, so
  the ciphertext left in memory no longer yields the key.
- **Never exposed:** keys are not written to disk, logged, or returned by a
  tool. A `Key` formats, logs and serializes as its address. `sessions.json`
  holds addresses, public keys and the approved scope only.
- **Never shared with Adena:** Adena receives only the public key.
- **Process hardening** happens before any key exists (see
  [Platform hardening](#platform-hardening)). If any step fails,
  `create_session` refuses to make keys and `get_status` lists the failures
  under `key_protection`; `ADENA_MCP_ALLOW_UNHARDENED=1` accepts the risk.
- Keys do not survive a restart; their sessions show `key_held: false`, can
  still be revoked, and otherwise expire on chain.

### The connection token

- 32 random bytes, issued only after the user approves a connection, and only
  to the process the host identified (pid and start time from the OS).
- adena-mcp keeps it in memory only and never returns it to the agent.
- Adena stores only its SHA-256 hash, together with that pid and start time,
  inside its encrypted grants. A token sent from any other process, including
  one captured by taking over the socket path, does not match.
- Removing the agent under Connected Apps, turning the agent connection off,
  or losing the `nativeMessaging` permission drops its grants.

### Stopping an agent

- Turning the agent connection off, or removing the agent under Connected
  Apps, stops adena-mcp from signing with its sessions: before every session
  signature (simulations included) it checks with Adena that its process is
  still connected, and refuses while Adena or the browser is not running.
- That pauses the sessions; it does not revoke them. They stay valid on chain
  until they expire or are revoked, and a transaction already signed with
  `sign_transaction` stays valid too. The AI Agent Connection screen says so
  and links to Manage Sessions, where the user sees the master account's
  sessions and revokes them (one, or all).

## What limits an agent

The user's approval and these rules bound what a session can do, whatever
the agent asks for:

| Rule | Enforced by |
|---|---|
| `allow_paths` entries: `vm/exec:<full realm path>` (the chain also allows its sub-paths) and `bank/send` | Adena |
| `vm/run` only when **Allow script (vm/run) sessions** is on (default off), since a script can call any realm as the user | Adena |
| Refused: `*`, `vm/exec` without a path, paths broader than one realm (`vm/exec:gno.land`, a whole namespace), `bank/multisend`, anything else; at most 16 entries | Adena |
| Total spend: `spend_limit × windows ≤ maximum`, where windows is 1 for `spend_period` 0, otherwise `floor((lifetime + 300s) / spend_period) + 1`. Maximum: 10 GNOT by default, set by the user. Gas fees count | Adena; the chain enforces each window |
| Lifetime at most 7 days, expiry in the future | Adena; the chain enforces expiry |
| Sessions never sign `auth/*` messages or deploy packages | The chain (and adena-mcp refuses `/vm.m_addpkg` up front) |
| Every message matches the session's `allow_paths` | The chain |

The spend limit bounds GNOT only. A session allowed to call a realm can move
the tokens and NFTs that realm holds for the user, and use realm permissions
the user has (admin roles, names, votes), because the caller is the user.

After approval, adena-mcp reads the session from the chain and destroys the
key if its key, scope, budget or expiry differ from the request
(`session_mismatch`, `session_not_found`).

## Local processes

- The socket and `~/.adena-agent` are owner-only. The host refuses peers of
  another user (`SO_PEERCRED` on Linux, `LOCAL_PEERCRED` on macOS).
- The host sets each request's `peer` (pid, start time, executable) from the
  OS and replaces whatever the client sent. Adena refuses to connect a process
  without a pid and start time.
- A process of the same user can ask to connect; the popup names the program.
  It cannot reuse another process's connection, since the token is bound to
  the issuing process.
- adena-mcp writes a request, and its token, only to a socket whose serving
  process is a host executable a browser manifest names (`host_untrusted`
  otherwise). This stops another program from posing as the host on the
  socket path. It does not stop a process that replaces the host binary
  itself (see [Limits](#limits)).
- Clients cannot send `cancel`; only the host does, for its own clients'
  abandoned requests.

## Web pages and other extensions

- A web page's request takes its protocol and hostname from the browser's
  sender information, never from the page, and the `agent:` protocol is
  refused for pages. A page cannot pass as a connected agent.
- Adena accepts an answer to an approval popup only from its own extension
  pages, and an answer to an agent popup only from that popup's window.
  Content scripts relay requests only.
- Native messaging lets only the store builds of Adena and the ids the user
  added start the host. Other extensions cannot reach Adena's background.

## Adena's storage

`chrome.storage.local` has no integrity protection: another process of the
user could edit it while the browser is closed. The settings and grants that
decide what agents may do are therefore stored encrypted and authenticated:

| Key | Content | Protection |
|---|---|---|
| `AGENT_HOST_POLICY` | Allow master account requests, maximum spend, allow script sessions | XChaCha20-Poly1305 under the wallet password's Argon2id key and the wallet salt, tagged `agent-policy-v1` |
| `AGENT_HOST_CONNECTION_GRANTS` | Token hashes with pid and start time, per account and agent | Same, tagged `agent-grants-v1` |
| `AGENT_HOST_CONNECTION_TOKENS` | A plain copy of the grants | None. Used only while the wallet is locked, to tell an approved process to wait for an unlock; it never authorizes a request |
| `AGENT_HOST_ENABLED` | The agent connection switch | None; turning it on still needs the `nativeMessaging` permission |

- A record that is missing, does not decrypt, or carries the wrong tag reads
  as the defaults (master requests off, 10 GNOT, scripts off, no grants).
  Tampering can turn things off, never on.
- The key is the vault's own (password and Argon2id), so the stored records
  are no easier to attack offline than the vault.
- Changing the password re-encrypts them; if that is impossible, they are
  dropped. Resetting the wallet deletes them.
- Not detected: rolling back to an older record the user once saved.

## Platform hardening

| Platform | adena-mcp |
|---|---|
| macOS | Core dumps off. `PT_DENY_ATTACH` refuses debuggers. Release binaries are signed with the hardened runtime, which refuses `task_for_pid` and injected libraries. Builds from source are not signed. |
| Linux | Core dumps off. The dumpable flag is cleared, so other processes of the user cannot ptrace it or read `/proc/<pid>/mem`. Release binaries are built static (`CGO_ENABLED=0`), so `LD_PRELOAD` does not apply. |

## Limits

- **Root and the kernel** can read any process's memory, including a key
  while it signs.
- **The signing library** makes short-lived copies inside the elliptic-curve
  computation.
- **Files the user owns can be changed by the user's own processes.** AI
  coding agents usually run shell commands as the user, so a prompt-injected
  agent is such a process. It can replace the host in `~/.adena-agent/bin`,
  edit the browser manifests, or the npx cache. A replaced
  host sees every request and could alter one before Adena shows it, and
  could fake the RPC URL that the post-approval check uses. What still holds
  is enforced inside Adena and on chain: the policy, the approval popup, and
  the session's scope.
- **Rollback** of Adena's encrypted agent records is not detected.
- **Several browsers:** only one serves agents at a time; `get_status` names
  it.

## Recommendations

- Read each approval in Adena: a session's key, paths, spend limit, period
  and expiry are shown there.
- Run the agent in its sandbox where it has one. Deny it writes to
  `~/.adena-agent`, the browser profile and native messaging directories, and
  the npm cache, and allow it to connect to `~/.adena-agent/agent.sock`.
- Keep the spend maximum low, script sessions off, and master account
  requests off unless a task needs them.
- Pin the release in the MCP client configuration (`setup` does this).
