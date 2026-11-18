# @adena-wallet/mcp

An MCP server that lets AI agents act on gno.land as an
[Adena](https://adena.app) user through session accounts. The user approves
every session and its revocation in Adena. The session key has no seed phrase,
stays in locked memory and is never shown to the agent.

## Setup

1. In Adena, turn on **Settings → Security & Privacy → AI Agent Connection**.

2. Add the server to your agent. For Claude Code:

   ```sh
   claude mcp add --scope user adena -- npx -y @adena-wallet/mcp
   ```

   Or install the plugin, which adds the server and an `adena` skill:

   ```sh
   claude plugin marketplace add onbloc/adena-wallet
   claude plugin install adena@adena
   ```

   For other clients (Claude Desktop, Cursor, Codex, OpenCode, Gemini CLI, VS Code,
   Windsurf), point them at `npx -y @adena-wallet/mcp`:

   ```json
   { "mcpServers": { "adena": { "command": "npx", "args": ["-y", "@adena-wallet/mcp"] } } }
   ```

3. Ask the agent to call `connect_wallet`. It installs the agent host the first
   time (macOS and Linux), and you approve the connection in Adena.

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
| `adena-mcp install-host [-extension-path <dir>] [-chrome-extension-id <id>]` | Copies the host to `~/.adena-agent/bin` and registers it with the installed browsers. Unpacked Adena builds loaded in Chromium profiles are allowed automatically (`-detect=false` turns this off). |
| `adena-mcp uninstall-host` | Removes the browser registrations and the copied host |
| `adena-mcp version` | Prints the version |

Supported platforms: macOS and Linux on arm64 and x64.

See [misc/adena-mcp](https://github.com/onbloc/adena-wallet/tree/main/misc/adena-mcp)
for tools, the safety model and configuration.
