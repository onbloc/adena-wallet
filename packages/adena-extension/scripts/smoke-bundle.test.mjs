import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { test } from 'node:test';

const script = resolve(import.meta.dirname, 'smoke-bundle.mjs');
const fixture = resolve(import.meta.dirname, 'fixtures/smoke');

const smoke = env =>
  spawnSync(process.execPath, [script, fixture], { encoding: 'utf8', env: { ...process.env, ...env } });

test('passes when every entry loads', () => {
  const { status, stdout } = smoke({});
  assert.equal(status, 0, stdout);
  assert.match(stdout, /all entries loaded/);
});

test('fails when only the content module behind the crx loader throws', () => {
  const { status, stderr } = smoke({ SMOKE_FIXTURE_FAIL_CONTENT: '1' });
  assert.equal(status, 1);
  assert.match(stderr, /content script \(assets\/content-loader\.js\): Error: content module failed to evaluate/);
});
