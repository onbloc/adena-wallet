---
name: adena
description: Use when the user wants to act on gno.land with their Adena wallet — check the wallet, connect it, send GNOT, call or run realm code, deploy a package, or sign a transaction — through the adena MCP tools (get_status, connect_wallet, create_session, get_sessions, revoke_session, send_transaction, sign_transaction).
---

# Adena wallet

The adena MCP tools act on gno.land as the user of the Adena browser wallet.
The user's master key never leaves Adena. Work goes through **session
accounts**: scoped keys the user approves once in Adena, which then sign
without popups.

## Flow

1. **`get_status`**. Always start here. If `state` is not `ready`, do what
   `next_step` says:
   - `host_not_installed`: call `connect_wallet`, which installs the agent host.
   - `adena_unreachable`: ask the user to open the browser, unlock Adena and
     turn on *Settings → Security & Privacy → AI Agent Connection*.
   - `locked`: ask the user to unlock Adena.
   - `not_connected`: call `connect_wallet`. The user approves the connection
     in Adena.
2. **`create_session`** with the narrowest scope the task needs:
   - `allow_paths`: `"vm/exec:<realm path>"` per realm called, `"vm/run"` to
     run scripts, `"bank/send"` to send coins. Never ask for broader paths
     than the task needs. `"*"` is refused.
   - `spend_limit`: one ugnot amount, e.g. `"5000000ugnot"`. It also pays gas
     for every transaction, and cannot exceed `max_spend_limit` from
     `get_status`, which the user sets in Adena.
   - `expires_in`: as short as the task allows (default `1h`, at most `168h`).

   The user approves it in Adena. Sessions cannot be widened later; create a
   new one if the scope changes.
3. **`send_transaction`** / **`sign_transaction`** with one or more messages.
   They sign with the session by default. Use `simulate: true` to check a
   transaction first.
4. **`revoke_session`** when the task is done. The user approves it in Adena.

Ask for one approval at a time: Adena shows them one by one and reports
`approval_pending` while another is open. After `approval_timeout`, do not
simply retry; check `get_sessions` (with `refresh: true`) or the account's
transactions first, because the user may have approved just in time.

## Messages

Adena's format. Signer fields (`caller`, `creator`, `from_address`) may be
omitted.

```json
{"type": "/vm.m_call", "value": {"pkg_path": "gno.land/r/demo/counter", "func": "Incr", "args": [], "send": ""}}
{"type": "/vm.m_run", "value": {"send": "", "package": {"name": "main", "path": "", "files": [{"name": "main.gno", "body": "package main\n\nfunc main() {}\n"}]}}}
{"type": "/vm.m_addpkg", "value": {"package": {"name": "foo", "path": "gno.land/p/<namespace>/foo", "files": [{"name": "foo.gno", "body": "..."}]}}}
{"type": "/bank.MsgSend", "value": {"to_address": "g1...", "amount": "1000000ugnot"}}
```

1 GNOT = 1,000,000 ugnot.

## Signing with the wallet instead

Pass `signer: "wallet"` to have the user approve and sign that transaction
in Adena with their master account. Use it when:

- the user asks to approve the transaction themselves, or
- it contains `/vm.m_addpkg` (package deployment), which sessions can never
  sign.

This only works if the user turned on **Allow master account requests** in
Adena (*Settings → Security & Privacy → AI Agent Connection*). `get_status`
reports it as `master_requests_allowed`. When it is off, the request fails
with `master_requests_disabled`; use a session, or ask the user to turn the
setting on.

## Rules

- Never ask for a seed phrase or private key. Session keys have none and are
  never shown.
- Tell the user what a session or transaction will allow before requesting
  it. They approve it in Adena.
- Session keys live only in the MCP server's memory. After a restart,
  `get_sessions` shows `key_held: false`; revoke those sessions and create
  new ones.
- `session_required` errors list the `required_allow_paths`. Create a session
  with them, or use `signer: "wallet"`.
