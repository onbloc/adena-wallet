#!/usr/bin/env node
// Launcher for the adena-mcp and adena-agent-host Go binaries shipped in the
// platform package that matches this machine.
'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PLATFORMS = new Set(['darwin-arm64', 'darwin-x64', 'linux-arm64', 'linux-x64']);
const HOST_BINARY = 'adena-agent-host';
const MCP_BINARY = 'adena-mcp';

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

// Browsers launch the host from the path in its manifest, and the npx cache
// is not a stable path, so the host is copied under the agent home first.
function installHost(args) {
  const source = path.join(binaryDir(), HOST_BINARY);
  const targetDir = path.join(agentHome(), 'bin');
  const target = path.join(targetDir, HOST_BINARY);

  fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
  const staging = `${target}.${process.pid}.tmp`;
  fs.copyFileSync(source, staging);
  fs.chmodSync(staging, 0o755);
  fs.renameSync(staging, target);

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
