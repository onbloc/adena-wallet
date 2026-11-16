# Adena wallet

The adena MCP tools act on gno.land as the user of the Adena browser wallet.

1. Start with `get_status` and follow its `next_step` until `state` is
   `ready`. `connect_wallet` installs the agent host and asks the user to
   connect.
2. `create_session` with the narrowest `allow_paths` (`"vm/exec:<realm>"`,
   `"vm/run"`, `"bank/send"`), a low `spend_limit` in ugnot (it also pays gas)
   and a short `expires_in`. The user approves it in Adena.
3. `send_transaction` / `sign_transaction` sign one or more messages
   (`/vm.m_call`, `/vm.m_run`, `/bank.MsgSend`) with the session. Use
   `signer: "wallet"` when the user wants to approve each transaction, or for
   `/vm.m_addpkg`, which sessions cannot sign.
4. `revoke_session` when done.

Never ask for a seed phrase or private key.
