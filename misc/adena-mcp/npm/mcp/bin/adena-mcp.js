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

// The browser runs whatever lands in the agent home's bin directory, so on
// POSIX systems both directories must belong to this user and be closed to
// others. Windows is checked by the host's own install, which takes over or
// clears a directory another account owns.
function secureDir(dir) {
  if (process.platform === 'win32') {
    return;
  }
  const info = fs.statSync(dir);
  if (info.uid !== process.getuid()) {
    fail(`${dir} belongs to another user; remove it or choose another ADENA_AGENT_HOME`);
  }
  if ((info.mode & 0o777) !== 0o700) {
    fs.chmodSync(dir, 0o700);
  }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

// The pid recorded in a retired (".old.<pid>.<time>") or staging
// (".<pid>[.<random>].tmp") copy of base, 0 when none is, or null when name is
// not such a copy. Go's installer uses the same names.
function leftoverOwner(base, name) {
  if (!name.startsWith(`${base}.`)) {
    return null;
  }
  const parts = name.slice(base.length + 1).split('.');
  let pidPart;
  if (parts[0] === 'old') {
    pidPart = parts[1];
  } else if (parts[parts.length - 1] === 'tmp') {
    pidPart = parts[0];
  } else {
    return null;
  }
  const pid = Number(pidPart);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : 0;
}

// Removes retired and leftover staging copies of target, except those of
// another installer that is still running: it may be about to rename them. A
// copy a running host still holds cannot be deleted on Windows; it is left for
// the next install.
function sweepRetired(target) {
  const dir = path.dirname(target);
  const base = path.basename(target);
  for (const name of fs.readdirSync(dir)) {
    const pid = leftoverOwner(base, name);
    if (pid === null || (pid > 0 && pid !== process.pid && isAlive(pid))) {
      continue;
    }
    try {
      fs.rmSync(path.join(dir, name), { force: true });
    } catch {
      // Still in use.
    }
  }
}

// Browsers launch the host from the path in its manifest, and the npx cache
// is not a stable path, so the host is copied under the agent home first.
// Windows cannot overwrite a running executable but can rename it, so the
// current copy is moved to a unique name before the new one takes its place.
function copyHost() {
  const source = path.join(binaryDir(), HOST_BINARY);
  const targetDir = path.join(agentHome(), 'bin');
  const target = path.join(targetDir, HOST_BINARY);

  fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  secureDir(agentHome());
  secureDir(targetDir);
  sweepRetired(target);

  const staging = `${target}.${process.pid}.tmp`;
  let retired = null;
  try {
    fs.copyFileSync(source, staging);
    fs.chmodSync(staging, 0o755);
    if (fs.existsSync(target)) {
      retired = `${target}.old.${process.pid}.${Date.now()}`;
      fs.renameSync(target, retired);
    }
    fs.renameSync(staging, target);
  } catch (error) {
    fs.rmSync(staging, { force: true });
    if (retired && !fs.existsSync(target)) {
      fs.renameSync(retired, target);
    }
    fail(`cannot install ${HOST_BINARY} to ${target}: ${error.message}`);
  }
  sweepRetired(target);

  process.stdout.write(`copied ${HOST_BINARY} to ${target}\n`);
  return target;
}

function installHost(args) {
  run(copyHost(), ['install', ...args]);
}

// The installed copy when there is one, so its agent home marker applies.
function hostBinary() {
  const installed = path.join(agentHome(), 'bin', HOST_BINARY);
  return fs.existsSync(installed) ? installed : path.join(binaryDir(), HOST_BINARY);
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
    const host = spawnSync(copyHost(), ['install', ...options.hostArgs], { stdio: 'inherit' });
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

// Deletes the copied host. On Windows a host the browser still runs cannot be
// deleted, so it is moved aside instead and removed by a later install, or by
// hand once the browser is closed.
function removeHostCopy(target) {
  try {
    fs.rmSync(target, { force: true });
    return;
  } catch {
    // Probably running; retire it below.
  }
  const retired = `${target}.old.${process.pid}.${Date.now()}`;
  try {
    fs.renameSync(target, retired);
    process.stdout.write(
      `the agent host is still running in the browser; moved it to ${retired}. ` +
        'It is removed by a later install, or delete it after closing the browser.\n',
    );
  } catch (error) {
    process.stderr.write(
      `@adena-wallet/mcp: could not remove ${target} (${error.message}); ` +
        'delete it after closing the browser.\n',
    );
  }
}

function uninstallHost() {
  const target = path.join(agentHome(), 'bin', HOST_BINARY);
  const binary = fs.existsSync(target) ? target : path.join(binaryDir(), HOST_BINARY);

  const child = spawn(binary, ['uninstall'], { stdio: 'inherit' });
  child.on('error', (error) => fail(`cannot start ${binary}: ${error.message}`));
  child.on('exit', (code) => {
    if (code === 0) {
      removeHostCopy(target);
    }
    process.exit(code ?? 1);
  });
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
    run(hostBinary(), ['extensions', ...rest]);
    break;
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  default:
    run(path.join(binaryDir(), MCP_BINARY), process.argv.slice(2));
}
