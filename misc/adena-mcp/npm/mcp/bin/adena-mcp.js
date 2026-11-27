#!/usr/bin/env node
// Launcher for the adena-mcp and adena-agent-host Go binaries shipped in the
// platform package that matches this machine.
'use strict';

const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLATFORMS = new Set([
  'darwin-arm64',
  'darwin-x64',
  'linux-arm64',
  'linux-x64',
  'win32-arm64',
  'win32-x64',
]);
const EXE = process.platform === 'win32' ? '.exe' : '';
const HOST_BINARY = `adena-agent-host${EXE}`;
const MCP_BINARY = `adena-mcp${EXE}`;

function fail(message) {
  process.stderr.write(`@adena-wallet/mcp: ${message}\n`);
  process.exit(1);
}

function platformKey() {
  const key = `${process.platform}-${process.arch}`;
  if (!PLATFORMS.has(key)) {
    fail(`unsupported platform ${key}; supported: ${[...PLATFORMS].join(', ')}`);
  }
  return key;
}

// Resolves the directory holding the binaries: an explicit override, the
// installed platform package, or a sibling directory in a local build.
function binaryDir() {
  if (process.env.ADENA_MCP_BIN_DIR) {
    return process.env.ADENA_MCP_BIN_DIR;
  }

  const key = platformKey();
  const packageName = `@adena-wallet/mcp-${key}`;
  try {
    return path.join(path.dirname(require.resolve(`${packageName}/package.json`)), 'bin');
  } catch {
    const sibling = path.join(__dirname, '..', '..', `mcp-${key}`, 'bin');
    if (fs.existsSync(sibling)) {
      return sibling;
    }
  }

  fail(`${packageName} is not installed; reinstall @adena-wallet/mcp without --no-optional`);
}

function agentHome() {
  return process.env.ADENA_AGENT_HOME || path.join(os.homedir(), '.adena-agent');
}

function run(binary, args) {
  const child = spawn(binary, args, { stdio: 'inherit' });

  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(signal, () => child.kill(signal));
  }

  child.on('error', (error) => fail(`cannot start ${binary}: ${error.message}`));
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });
}

// Install, uninstall and extension commands run only the host shipped in this
// package. The host itself checks the agent home (owner, permissions or ACL,
// links) before it copies itself there, registers or deletes anything, so no
// file from a directory another account may control is ever run.
function packagedHost() {
  return path.join(binaryDir(), HOST_BINARY);
}

function installHost(args) {
  run(packagedHost(), ['install', '-copy', ...args]);
}

function packageVersion() {
  try {
    return require('../package.json').version;
  } catch {
    return '';
  }
}

function parseSetupArgs(args) {
  const options = { only: null, dryRun: false, force: false, clients: true, hostArgs: [] };
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--clients') {
      options.only = (args[(i += 1)] ?? '').split(',').filter(Boolean);
    } else if (arg.startsWith('--clients=')) {
      options.only = arg.slice('--clients='.length).split(',').filter(Boolean);
    } else if (arg === '--no-clients') {
      options.clients = false;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--') {
      options.hostArgs = args.slice(i + 1);
      break;
    } else {
      fail(`unknown setup option ${arg}; see: npx -y @adena-wallet/mcp help`);
    }
  }
  return options;
}

// One command for a new machine: installs the agent host for every browser,
// registers this server with the AI clients found, and says what is left.
function setup(args) {
  const options = parseSetupArgs(args);

  if (options.dryRun) {
    process.stdout.write(`would copy ${HOST_BINARY} to ${path.join(agentHome(), 'bin')} and register it\n`);
  } else {
    const host = spawnSync(packagedHost(), ['install', '-copy', ...options.hostArgs], {
      stdio: 'inherit',
    });
    if (host.status !== 0) {
      fail('installing the agent host failed; see the messages above');
    }
  }

  if (options.clients) {
    const { registerClients } = require('./clients');
    let lines;
    try {
      lines = registerClients(packageVersion(), options);
    } catch (error) {
      fail(error.message);
    }
    process.stdout.write(`\nAI clients:\n${lines.map((line) => `  ${line}`).join('\n')}\n`);
  }

  process.stdout.write(
    '\nNext steps:\n' +
      '  1. In Adena: Settings > Security & Privacy > AI Agent Connection > Enable agent connection\n' +
      '     (reload Adena if the screen asks).\n' +
      '  2. Restart your AI client and ask it to "connect my Adena wallet"; approve the connection in Adena.\n',
  );
}

function printHelp() {
  process.stdout.write(`usage: npx -y @adena-wallet/mcp [command]

  (no command)          run the MCP server over stdio
  setup                 install the agent host and register this server with your AI clients
      --clients a,b     only these clients (${require('./clients').clientIds().join(', ')})
      --no-clients      only install the agent host
      --dry-run         show what would change
      --force           replace an existing "adena" entry in JSON client configs
      -- <flags>        flags for the host install, e.g. -- -chrome-extension-id <id>
  install-host          install the agent host only
  uninstall-host        remove the agent host
  extensions [list|add <id>|add -path <dir>|remove <id>|detect [-allow]]
                        manage the Adena builds besides the store build that may use the agent host
  version               print the version
`);
}

// The packaged host removes the registrations and its copy in the agent home;
// a copy the browser still runs on Windows is moved aside for a later install.
function uninstallHost() {
  run(packagedHost(), ['uninstall']);
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'setup':
    setup(rest);
    break;
  case 'install-host':
    installHost(rest);
    break;
  case 'uninstall-host':
    uninstallHost();
    break;
  case 'extensions':
    run(packagedHost(), ['extensions', ...rest]);
    break;
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  default:
    run(path.join(binaryDir(), MCP_BINARY), process.argv.slice(2));
}
