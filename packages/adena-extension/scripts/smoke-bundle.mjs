// Loads every entry of a built extension and fails if any of them throws while
// its modules evaluate (e.g. a broken polyfill). Unit tests run the sources, not
// the bundle, so they cannot see this class of error.
//
// Usage: node scripts/smoke-bundle.mjs [dist|dist-firefox]
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';

import { JSDOM } from 'jsdom';

const outDir = resolve(import.meta.dirname, '..', process.argv[2] ?? 'dist');
const manifest = JSON.parse(readFileSync(resolve(outDir, 'manifest.json'), 'utf8'));

// Any chrome.* path is a no-op function that resolves, so entries can register
// their listeners without an extension runtime.
const stub = () =>
  new Proxy(function () {}, {
    get: (_, key) => {
      if (key === 'then') return undefined;
      if (key === 'getURL') return path => pathToFileURL(resolve(outDir, String(path).replace(/^\//, ''))).href;
      if (key === 'id') return 'smoke-test';
      return stub();
    },
    apply: () => Promise.resolve(undefined),
  });

const dom = new JSDOM('<!doctype html><html><head></head><body><div id="popup"></div><div id="web"></div><div id="portal-popup"></div></body></html>', {
  url: 'https://smoke.test/',
  pretendToBeVisual: true,
});
for (const key of Object.getOwnPropertyNames(dom.window)) {
  if (!(key in globalThis)) {
    try {
      globalThis[key] = dom.window[key];
    }
    catch {
      // Read-only globals Node already provides.
    }
  }
}
globalThis.window = dom.window;
globalThis.self = globalThis;
globalThis.document = dom.window.document;
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
globalThis.removeEventListener = dom.window.removeEventListener.bind(dom.window);
// jsdom has no canvas backend; hand out a 2D context that ignores drawing.
dom.window.HTMLCanvasElement.prototype.getContext = () =>
  new Proxy({}, { get: (target, key) => (key in target ? target[key] : () => undefined), set: () => true });
globalThis.chrome = stub();
globalThis.browser = globalThis.chrome;

const scriptsOf = html =>
  [...readFileSync(resolve(outDir, html), 'utf8').matchAll(/<script[^>]*src="?([^"\s>]+)"?/g)].map(m => m[1]);

const entries = [
  ['background', manifest.background.service_worker ?? manifest.background.scripts[0]],
  ...manifest.content_scripts.flatMap(({ js }) => js.map(file => ['content script', file])),
  ...['popup.html', 'register.html', 'security.html'].flatMap(html => scriptsOf(html).map(file => [html, file])),
];

const failures = [];
const record = label => error => failures.push(`${label}: ${error?.stack ?? error}`);
const asyncErrors = [];
process.on('uncaughtException', error => asyncErrors.push(error));
process.on('unhandledRejection', error => asyncErrors.push(error));
// React reports render errors that no boundary caught through window error events.
const renderErrors = [];
dom.window.addEventListener('error', event => renderErrors.push(event.error ?? event.message));

for (const [label, file] of entries) {
  try {
    await import(pathToFileURL(resolve(outDir, file.replace(/^\.?\//, ''))).href);
    console.log(`ok   ${label} (${file})`);
  }
  catch (error) {
    record(`${label} (${file})`)(error);
  }
}

// inject.js runs in the page as a classic script.
try {
  vm.runInThisContext(readFileSync(resolve(outDir, 'inject.js'), 'utf8'), { filename: 'inject.js' });
  console.log('ok   inject.js');
}
catch (error) {
  record('inject.js')(error);
}

// Let dynamically imported chunks settle before reporting.
await new Promise(done => setTimeout(done, 500));

// Content scripts load their chunk asynchronously; a chunk that fails to
// evaluate only surfaces here. The stubbed runtime makes other async work fail
// too, so only module-evaluation errors are treated as failures.
for (const error of asyncErrors) {
  const where = String(error?.stack ?? '');
  if (/at (async )?(ModuleJob|link|.*evaluate)/.test(where) || /is not a function|is not defined|Cannot find module/.test(String(error?.message))) {
    record('async load')(error);
  }
  else {
    console.warn(`note ${String(error?.message ?? error).split('\n')[0]}`);
  }
}

for (const error of renderErrors) {
  record('render')(error);
}

if (failures.length > 0) {
  console.error(`\n${failures.length} entr${failures.length === 1 ? 'y' : 'ies'} failed to load:\n`);
  for (const failure of failures) console.error(failure.split('\n').slice(0, 4).join('\n') + '\n');
  process.exit(1);
}
console.log('\nall entries loaded');
process.exit(0);
