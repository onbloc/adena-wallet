# @adena-wallet/mcp

An MCP server that lets AI agents act on gno.land as an
[Adena](https://adena.app) user through session accounts. The user approves
every session and its revocation in Adena. The session key has no seed phrase,
stays in locked memory and is never shown to the agent.

## Setup

1. Run, with this package's version:

   ```sh
   npx -y @adena-wallet/mcp@<version> setup
   ```

   It installs the agent host for your browsers and adds the server, pinned to
   that version, to the AI clients it finds (Claude Code, Codex, Cursor, Gemini
   CLI, Claude Desktop, Windsurf, OpenCode). `--clients claude,cursor` picks
   clients, `--no-clients` skips them, `--dry-run` only shows the changes.

2. In Adena, turn on **Settings → Security & Privacy → AI Agent Connection**.

3. Restart the AI client and ask it to connect your Adena wallet; approve the
   connection in Adena.

To add the server by hand instead, point the client at
`npx -y @adena-wallet/mcp@<version>`; `connect_wallet` installs the host on
first use. With Claude Code you can also install the plugin:

```sh
claude plugin marketplace add onbloc/adena-wallet
claude plugin install adena@adena
```

`npx -y @adena-wallet/mcp uninstall-host` removes the host.

## Tools

`get_status`, `connect_wallet`, `create_session`, `get_sessions`,
`revoke_session`, `send_transaction`, `sign_transaction`. Transactions are
signed with a session you approved once; pass `signer: "wallet"` to approve a
transaction in Adena instead.

## Commands

| Command | What it does |
|---|---|
| `adena-mcp` | Runs the MCP server over stdio |
| `adena-mcp setup [--clients a,b] [--no-clients] [--dry-run] [--force] [-- <install flags>]` | Installs the host and registers the server with your AI clients |
| `adena-mcp install-host [-extension-path <dir>] [-chrome-extension-id <id>] [-allow-detected]` | Copies the host to `~/.adena-agent/bin` and registers it with the installed browsers. It offers the unpacked Adena builds it finds in Chromium profiles and allows only those you confirm (`-detect=false` skips this). |
| `adena-mcp extensions [list \| add <id> \| add -path <dir> \| remove <id> \| detect [-allow]]` | Manages the Adena builds besides the store build that may use the host. The list is kept in `~/.adena-agent/extensions.json` and applied on every install, upgrade and server start. |
| `adena-mcp uninstall-host` | Removes the browser registrations and the copied host |
| `adena-mcp version` | Prints the version |

Supported platforms: macOS and Linux on arm64 and x64.

See [misc/adena-mcp](https://github.com/onbloc/adena-wallet/tree/main/misc/adena-mcp)
for tools, the safety model and configuration.
