// Builds the npm packages for @adena-wallet/mcp into npm/dist:
//   dist/mcp               the launcher package
//   dist/mcp-<os>-<arch>   one package per platform with the Go binaries
//
// Usage: node npm/build.mjs --version 0.1.0 [--platforms darwin-arm64,linux-x64]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const npmDir = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = path.dirname(npmDir);
const repoRoot = path.resolve(moduleDir, '..', '..');
const distDir = path.join(npmDir, 'dist');

const TARGETS = {
  'darwin-arm64': { goos: 'darwin', goarch: 'arm64', os: 'darwin', cpu: 'arm64' },
  'darwin-x64': { goos: 'darwin', goarch: 'amd64', os: 'darwin', cpu: 'x64' },
  'linux-arm64': { goos: 'linux', goarch: 'arm64', os: 'linux', cpu: 'arm64' },
  'linux-x64': { goos: 'linux', goarch: 'amd64', os: 'linux', cpu: 'x64' },
};

const BINARIES = ['adena-mcp', 'adena-agent-host'];

function parseArgs(argv) {
  const args = { platforms: Object.keys(TARGETS) };
  for (let i = 0; i < argv.length; i += 2) {
    const [flag, value] = [argv[i], argv[i + 1]];
    if (flag === '--version') args.version = value;
    else if (flag === '--platforms') args.platforms = value.split(',');
    else throw new Error(`unknown flag ${flag}`);
  }
  if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(args.version ?? '')) {
    throw new Error('--version must be a semver such as 0.1.0');
  }
  for (const platform of args.platforms) {
    if (!TARGETS[platform]) throw new Error(`unknown platform ${platform}`);
  }
  return args;
}

function writeJSON(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function buildPlatform(platform, version, launcher) {
  const target = TARGETS[platform];
  const dir = path.join(distDir, `mcp-${platform}`);
  fs.mkdirSync(path.join(dir, 'bin'), { recursive: true });

  for (const binary of BINARIES) {
    execFileSync(
      'go',
      [
        'build',
        '-trimpath',
        '-ldflags',
        `-s -w -X main.version=${version}`,
        '-o',
        path.join(dir, 'bin', binary),
        `./apps/${binary}/cmd/${binary}`,
      ],
      {
        cwd: moduleDir,
        stdio: 'inherit',
        env: { ...process.env, CGO_ENABLED: '0', GOOS: target.goos, GOARCH: target.goarch },
      },
    );
  }

  writeJSON(path.join(dir, 'package.json'), {
    name: `@adena-wallet/mcp-${platform}`,
    version,
    description: `adena-mcp binaries for ${platform}`,
    license: launcher.license,
    repository: launcher.repository,
    os: [target.os],
    cpu: [target.cpu],
    files: ['bin', 'LICENSE'],
  });
  fs.copyFileSync(path.join(repoRoot, 'LICENSE'), path.join(dir, 'LICENSE'));
}

function buildLauncher(version, platforms, launcher) {
  const dir = path.join(distDir, 'mcp');
  fs.cpSync(path.join(npmDir, 'mcp'), dir, { recursive: true });
  fs.copyFileSync(path.join(npmDir, 'README.md'), path.join(dir, 'README.md'));
  fs.copyFileSync(path.join(repoRoot, 'LICENSE'), path.join(dir, 'LICENSE'));

  writeJSON(path.join(dir, 'package.json'), {
    ...launcher,
    version,
    optionalDependencies: Object.fromEntries(
      platforms.map((platform) => [`@adena-wallet/mcp-${platform}`, version]),
    ),
  });
}

const { version, platforms } = parseArgs(process.argv.slice(2));
const launcher = JSON.parse(fs.readFileSync(path.join(npmDir, 'mcp', 'package.json'), 'utf8'));

fs.rmSync(distDir, { recursive: true, force: true });
for (const platform of platforms) {
  buildPlatform(platform, version, launcher);
}
buildLauncher(version, platforms, launcher);

console.log(`built @adena-wallet/mcp ${version} for ${platforms.join(', ')} in ${distDir}`);
