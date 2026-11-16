# @adena-wallet/mcp

An MCP server that lets AI agents act on gno.land as an
[Adena](https://adena.app) user through session accounts. The user approves
every session and its revocation in Adena. The session key has no seed phrase,
stays in locked memory and is never shown to the agent.

## Setup

1. Register the agent host with your browsers (macOS and Linux). This only
   needs to be done once:

   ```sh
   npx -y @adena-wallet/mcp install-host
   ```

2. In Adena, turn on **Settings → Security & Privacy → AI Agent Connection**.

3. Add the server to your agent, for example Claude Code:

   ```sh
   claude mcp add adena -- npx -y @adena-wallet/mcp
   ```

`npx -y @adena-wallet/mcp uninstall-host` removes the host.

## Commands

| Command | What it does |
|---|---|
| `adena-mcp` | Runs the MCP server over stdio |
| `adena-mcp install-host [-chrome-extension-id <id>]` | Copies the host to `~/.adena-agent/bin` and registers it with the installed browsers |
| `adena-mcp uninstall-host` | Removes the browser registrations and the copied host |
| `adena-mcp version` | Prints the version |

Supported platforms: macOS and Linux on arm64 and x64.

See [misc/adena-mcp](https://github.com/onbloc/adena-wallet/tree/main/misc/adena-mcp)
for tools, the safety model and configuration.
