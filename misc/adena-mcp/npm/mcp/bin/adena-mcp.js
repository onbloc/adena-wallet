#!/usr/bin/env node
// Launcher for the adena-mcp and adena-agent-host Go binaries shipped in the
// platform package that matches this machine.
'use strict';

const { spawn } = require('node:child_process');
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

// Removes retired and leftover staging copies of target. A copy a running host
// still holds cannot be deleted on Windows; it is left for the next install.
function sweepRetired(target) {
  const dir = path.dirname(target);
  const base = path.basename(target);
  for (const name of fs.readdirSync(dir)) {
    const retired = name.startsWith(`${base}.old`);
    const staging = name.startsWith(`${base}.`) && name.endsWith('.tmp');
    if (!retired && !staging) {
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
function installHost(args) {
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
      retired = `${target}.old.${Date.now()}.${process.pid}`;
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
  run(target, ['install', ...args]);
}

function uninstallHost() {
  const target = path.join(agentHome(), 'bin', HOST_BINARY);
  const binary = fs.existsSync(target) ? target : path.join(binaryDir(), HOST_BINARY);

  const child = spawn(binary, ['uninstall'], { stdio: 'inherit' });
  child.on('error', (error) => fail(`cannot start ${binary}: ${error.message}`));
  child.on('exit', (code) => {
    if (code === 0) {
      fs.rmSync(target, { force: true });
    }
    process.exit(code ?? 1);
  });
}

const [command, ...rest] = process.argv.slice(2);

switch (command) {
  case 'install-host':
    installHost(rest);
    break;
  case 'uninstall-host':
    uninstallHost();
    break;
  default:
    run(path.join(binaryDir(), MCP_BINARY), process.argv.slice(2));
}
