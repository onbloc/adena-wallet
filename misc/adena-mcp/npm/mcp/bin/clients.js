'use strict';
// Registers the adena MCP server with the AI clients installed for this user.

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SERVER_NAME = 'adena';
const PACKAGE = '@adena-wallet/mcp';

// The npx command line that starts the server, pinned to this release so a
// later publish never runs without the user updating on purpose.
function serverCommand(version) {
  const spec = version && version !== '0.0.0' ? `${PACKAGE}@${version}` : PACKAGE;
  const args = ['-y', spec];
  // Windows clients start commands without a shell, and npx is a .cmd script.
  if (process.platform === 'win32') {
    return { command: 'cmd', args: ['/c', 'npx', ...args] };
  }
  return { command: 'npx', args };
}

function onPath(binary) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [binary], { stdio: 'ignore' }).status === 0;
}

function appData() {
  return process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
}

// Clients configured through their own CLI.
function cliClient(id, name, binary, addArgs) {
  return {
    id,
    name,
    detect: () => onPath(binary),
    register(server, { dryRun }) {
      const args = [...addArgs, SERVER_NAME, '--', server.command, ...server.args];
      if (dryRun) {
        return `would run: ${binary} ${args.join(' ')}`;
      }
      const result = spawnSync(binary, args, { encoding: 'utf8', shell: process.platform === 'win32' });
      const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
      if (result.status === 0) {
        return 'added';
      }
      if (/already exists/i.test(output)) {
        return `already configured (remove it with "${binary} mcp remove ${SERVER_NAME}" to re-add)`;
      }
      throw new Error(output || `${binary} exited with ${result.status}`);
    },
  };
}

// Clients configured through a JSON file. entry builds the server entry and
// key names the object holding servers.
function jsonClient(id, name, file, key, entry) {
  return {
    id,
    name,
    detect: () => fs.existsSync(path.dirname(file)),
    register(server, { dryRun, force }) {
      let config = {};
      if (fs.existsSync(file)) {
        try {
          config = JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch {
          // Comments or other edits: leave the file alone.
          throw new Error(`${file} is not plain JSON; add ${JSON.stringify({ [key]: { [SERVER_NAME]: entry(server) } })} by hand`);
        }
      }
      if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        throw new Error(`${file} does not hold a JSON object`);
      }
      const servers = config[key] ?? {};
      if (servers[SERVER_NAME] && !force) {
        return `already configured in ${file} (use --force to replace it)`;
      }
      if (dryRun) {
        return `would add "${SERVER_NAME}" to ${key} in ${file}`;
      }
      config[key] = { ...servers, [SERVER_NAME]: entry(server) };
      writeJSONAtomic(file, config);
      return `added to ${file}`;
    },
  };
}

function writeJSONAtomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, `${file}.adena-backup`);
  }
  const staging = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(staging, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(staging, file);
}

const stdioEntry = (server) => ({ command: server.command, args: server.args });

function clients() {
  const home = os.homedir();
  const claudeDesktop =
    process.platform === 'darwin'
      ? path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      : path.join(appData(), 'Claude', 'claude_desktop_config.json');

  return [
    cliClient('claude', 'Claude Code', 'claude', ['mcp', 'add', '--scope', 'user']),
    cliClient('codex', 'Codex CLI', 'codex', ['mcp', 'add']),
    jsonClient('cursor', 'Cursor', path.join(home, '.cursor', 'mcp.json'), 'mcpServers', stdioEntry),
    jsonClient('gemini', 'Gemini CLI', path.join(home, '.gemini', 'settings.json'), 'mcpServers', stdioEntry),
    jsonClient('claude-desktop', 'Claude Desktop', claudeDesktop, 'mcpServers', stdioEntry),
    jsonClient(
      'windsurf',
      'Windsurf',
      path.join(home, '.codeium', 'windsurf', 'mcp_config.json'),
      'mcpServers',
      stdioEntry,
    ),
    jsonClient(
      'opencode',
      'OpenCode',
      path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode', 'opencode.json'),
      'mcp',
      (server) => ({ type: 'local', command: [server.command, ...server.args], enabled: true }),
    ),
  ];
}

// Registers the server with the selected clients, or every detected one, and
// returns one line per client.
function registerClients(version, { only, dryRun, force }) {
  const server = serverCommand(version);
  const all = clients();
  const unknown = (only ?? []).filter((id) => !all.some((client) => client.id === id));
  if (unknown.length > 0) {
    throw new Error(`unknown client ${unknown.join(', ')}; known: ${all.map((c) => c.id).join(', ')}`);
  }

  const lines = [];
  for (const client of all) {
    if (only ? !only.includes(client.id) : !client.detect()) {
      continue;
    }
    try {
      lines.push(`${client.name}: ${client.register(server, { dryRun, force })}`);
    } catch (error) {
      lines.push(`${client.name}: not configured: ${error.message}`);
    }
  }
  if (lines.length === 0) {
    lines.push(
      `No supported AI client was found. Add this server by hand: ${server.command} ${server.args.join(' ')}`,
    );
  }
  return lines;
}

module.exports = { registerClients, serverCommand, clientIds: () => clients().map((c) => c.id) };
