#!/usr/bin/env node
/**
 * Fails when yarn.lock resolves a package version that is newer than the
 * minimum age, counting only versions added since a base ref. A freshly
 * published version is where a hijacked maintainer account shows up first,
 * so new dependencies wait until the ecosystem has had time to notice.
 *
 *   node scripts/check-dependency-age.js [baseRef=main] [minAgeDays=30]
 *
 * To fix a finding, pin the descriptor to an older in-range version in the
 * root "resolutions".
 */
const {execFileSync} = require('child_process');
const {readFileSync} = require('fs');

const baseRef = process.argv[2] || 'main';
const minAgeDays = Number(process.argv[3] || 30);
const cutoff = new Date(Date.now() - minAgeDays * 86_400_000).toISOString();

const resolutions = (lockText) => {
  const found = new Set();
  for (const match of lockText.matchAll(/^ {2}resolution: "(.+)@npm:([^"]+)"/gm)) {
    found.add(`${match[1]}@${match[2]}`);
  }
  return found;
};

const before = resolutions(execFileSync('git', ['show', `${baseRef}:yarn.lock`], {encoding: 'utf8'}));
const after = resolutions(readFileSync('yarn.lock', 'utf8'));
const added = [...after].filter((entry) => !before.has(entry));

const byName = new Map();
for (const entry of added) {
  const at = entry.lastIndexOf('@');
  const name = entry.slice(0, at);
  byName.set(name, [...(byName.get(name) || []), entry.slice(at + 1)]);
}

const tooNew = [];
for (const [name, versions] of byName) {
  const times = JSON.parse(execFileSync('npm', ['view', name, 'time', '--json'], {encoding: 'utf8'}));
  for (const version of versions) {
    const published = times[version];
    if (!published || published >= cutoff) {
      tooNew.push(`${name}@${version} published ${published || 'unknown'}`);
    }
  }
}

console.log(`${added.length} versions added since ${baseRef}; minimum age ${minAgeDays} days.`);
if (tooNew.length > 0) {
  console.error(`Too new:\n  ${tooNew.join('\n  ')}`);
  process.exit(1);
}
