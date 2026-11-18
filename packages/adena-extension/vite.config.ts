import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { builtinModules } from 'node:module';
import { resolve } from 'node:path';

import { crx, type ManifestV3Export } from '@crxjs/vite-plugin';
import nodePolyfills from '@rolldown/plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import { build, defineConfig, type InlineConfig, loadEnv, type Plugin, type Rolldown } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

import { buildManifest } from './manifest.config';

const root = import.meta.dirname;

// web3auth.constant.ts reads these from process.env; they are inlined at build time.
const WEB3AUTH_ENV_KEYS = [
  'WEB3_AUTH_LEGACY_CLIENT_ID',
  'GOOGLE_LEGACY_VERIFIER',
  'GOOGLE_LEGACY_CLIENT_ID',
  'WEB3_AUTH_PRODUCTION_CLIENT_ID',
  'GOOGLE_PRODUCTION_VERIFIER',
  'GOOGLE_PRODUCTION_CLIENT_ID',
  'WEB3_AUTH_EMAIL_LEGACY_CLIENT_ID',
  'EMAIL_LEGACY_VERIFIER_NAME',
  'WEB3_AUTH_EMAIL_CLIENT_ID',
  'EMAIL_VERIFIER_NAME',
  'WEB3_AUTH_X_LEGACY_CLIENT_ID',
  'X_LEGACY_VERIFIER_NAME',
  'X_LEGACY_CLIENT_ID',
  'X_LEGACY_AUTH0_DOMAIN',
  'WEB3_AUTH_X_CLIENT_ID',
  'X_VERIFIER_NAME',
  'X_CLIENT_ID',
  'X_AUTH0_DOMAIN',
];

// AMO rejects any script over 5MB, so large chunks are split below it.
const MAX_CHUNK_SIZE = 3 * 1024 * 1024;

const INJECT_SCRIPT = 'inject.js';

const LOTTIE_PATH = resolve(root, 'libs/lottie_light.min.js');

// The dev server port is baked into the manifest's CSP and crx()'s loaders.
const DEV_SERVER_PORT = 5173;

export const alias = {
  '@types': resolve(root, 'src/types'),
  '@hooks': resolve(root, 'src/hooks'),
  '@ui': resolve(root, 'src/ui'),
  '@pages': resolve(root, 'src/pages'),
  '@router': resolve(root, 'src/router'),
  '@services': resolve(root, 'src/services'),
  '@styles': resolve(root, 'src/styles'),
  '@components': resolve(root, 'src/components'),
  '@states': resolve(root, 'src/states'),
  '@common': resolve(root, 'src/common'),
  '@inject': resolve(root, 'src/inject'),
  '@assets': resolve(root, 'src/assets'),
  '@repositories': resolve(root, 'src/repositories'),
  '@resources': resolve(root, 'src/resources'),
  '@migrates': resolve(root, 'src/migrates'),
  '@models': resolve(root, 'src/models'),
  // The manifests live outside public/, which would otherwise overwrite crx()'s output.
  '@public/manifest.json': resolve(root, 'manifest.json'),
  '@public': resolve(root, 'public'),
  'lottie-web': LOTTIE_PATH,
};

const DEV_ENTRIES = ['src/background.ts', 'src/content.ts', 'src/popup.tsx', 'src/web.tsx'];

const NODE_BUILTINS = new Set(builtinModules);
const POLYFILL_PREFIX = '\0polyfill-node.';
const SOURCE_DIR = resolve(root, 'src') + '/';

/**
 * Node built-in polyfills, resolved before Vite externalizes the built-ins.
 * The plugin also claims any bare import named like one of its internal helper
 * files, e.g. the npm package `inherits`, and hands CommonJS callers an ES module
 * namespace instead of the function (`util.inherits is not a function` in
 * readable-stream). Only built-ins and the plugin's own modules go through it.
 */
const polyfills = (): Plugin => {
  const plugin = nodePolyfills();
  const resolveId = plugin.resolveId as (this: unknown, ...args: unknown[]) => unknown;

  return {
    ...plugin,
    enforce: 'pre',
    resolveId(this: unknown, importee: string, importer: string | undefined, ...rest: unknown[]) {
      const name = importee.replace(/^node:/, '').replace(/\/$/, '');
      // The polyfill for `crypto` is an empty object, so any call on it fails at
      // runtime; extension code has to use Web Crypto instead.
      if (name === 'crypto' && importer?.startsWith(SOURCE_DIR)) {
        throw new Error(`${importer} imports Node's crypto, which bundles as an empty module; use globalThis.crypto`);
      }
      const isInternal = importee.startsWith('\0') || !!importer?.startsWith(POLYFILL_PREFIX);
      if (!isInternal && !NODE_BUILTINS.has(name)) return null;
      return resolveId.call(this, importee, importer, ...rest);
    },
  } as Plugin;
};

/**
 * Node globals for the dev server. A build injects `Buffer`, `process` and
 * `global` per module (see `polyfills`); the dev server serves modules
 * one by one without that step, so each entry sets them up first instead.
 */
const DEV_NODE_GLOBALS = '\0adena:dev-node-globals';
// The buffer polyfill itself reads `global`, so that one is set in a module of
// its own that evaluates first.
const DEV_GLOBAL = '\0adena:dev-global';

const devNodeGlobals = (entries: string[]): Plugin => ({
  name: 'adena:dev-node-globals',
  apply: 'serve',
  enforce: 'pre',
  resolveId(id) {
    return id === DEV_NODE_GLOBALS || id === DEV_GLOBAL ? id : null;
  },
  load(id) {
    if (id === DEV_GLOBAL) return 'globalThis.global ??= globalThis;';
    if (id !== DEV_NODE_GLOBALS) return null;
    return [
      `import ${JSON.stringify(DEV_GLOBAL)};`,
      'import { Buffer } from \'buffer\';',
      'import process from \'process\';',
      'globalThis.Buffer ??= Buffer;',
      'globalThis.process ??= process;',
    ].join('\n');
  },
  transform(code, id) {
    if (!entries.includes(id.split('?')[0])) return null;
    return { code: `import ${JSON.stringify(DEV_NODE_GLOBALS)};\n${code}`, map: null };
  },
});

/**
 * `libs/lottie_light.min.js` is a UMD script outside node_modules, so the dev
 * server neither pre-bundles nor converts it; hand it a CommonJS scope and
 * export what it assigns. Builds bundle it as CommonJS.
 */
const devUmdLottie = (): Plugin => ({
  name: 'adena:dev-umd-lottie',
  apply: 'serve',
  transform(code, id) {
    if (id.split('?')[0] !== LOTTIE_PATH) return null;
    return {
      code: `const module = { exports: {} };\n(function (module, exports) {\n${code}\n}).call(globalThis, module, module.exports);\nexport default module.exports;\n`,
      map: null,
    };
  },
});

/**
 * crx() keeps the manifest's CSP as is, but in dev every extension page and
 * the service worker load their modules from the dev server and take HMR
 * updates over its WebSocket.
 */
const allowDevServer = (manifest: Record<string, unknown>, port: number): void => {
  const csp = manifest.content_security_policy as { extension_pages?: string } | undefined;
  if (!csp?.extension_pages) return;
  csp.extension_pages = csp.extension_pages
    .replace(/script-src ([^;]*)/, `script-src $1 http://localhost:${port}`)
    .replace(/connect-src ([^;]*)/, `connect-src $1 ws://localhost:${port}`);
};

// Set for the child process that rebuilds inject.js next to the dev server.
const INJECT_WATCH_ENV = 'ADENA_INJECT_WATCH';

type InjectBuildOptions = {
  mode: string;
  target: string;
  sourcemap: boolean;
  minify: boolean;
  define: Record<string, string>;
};

const injectBuildConfig = (options: InjectBuildOptions & { outDir: string }): InlineConfig => ({
  configFile: false,
  logLevel: 'warn',
  mode: options.mode,
  resolve: { alias },
  define: options.define,
  plugins: [polyfills()],
  build: {
    outDir: options.outDir,
    emptyOutDir: false,
    sourcemap: options.sourcemap,
    minify: options.minify,
    target: options.target,
    lib: {
      entry: resolve(root, 'src/inject.ts'),
      formats: ['iife'],
      name: 'adenaInject',
      fileName: () => INJECT_SCRIPT,
    },
  },
});

/**
 * content.ts loads `inject.js` into the page as a classic script, so it has to be
 * one self-contained file. crx()'s own IIFE build runs without plugins and would
 * drop the node polyfills, hence this separate build. It runs inside the main
 * build so watch mode tracks its sources and the file lands in the same output.
 */
const injectScript = (options: InjectBuildOptions): Plugin => {
  let files: { fileName: string; source: string | Uint8Array }[] = [];
  let outDir = '';
  let isServe = false;

  return {
    name: 'adena:inject-script',
    configResolved(config) {
      // Honour `--outDir` as well as the config value.
      outDir = resolve(config.root, config.build.outDir);
      isServe = config.command === 'serve';
    },
    // Pages run inject.js from disk, so the dev server cannot hand it out; a
    // watching build writes it next to crx()'s files instead, and a change needs
    // a page reload, as it does for the packaged extension. That build runs in a
    // child process: a second Vite build in this one swaps the config crx()
    // reads its HMR token from, and the service worker's socket is refused.
    configureServer(server) {
      const child = spawn(
        process.execPath,
        [process.argv[1], 'build', '--watch', '--mode', options.mode, '--outDir', outDir, '--', ...process.argv.filter(arg => arg.startsWith('--browser='))],
        { cwd: root, env: { ...process.env, [INJECT_WATCH_ENV]: '1' }, stdio: 'inherit' },
      );
      const stop = (): void => {
        child.kill();
      };
      server.httpServer?.once('close', stop);
      process.once('exit', stop);
    },
    async buildEnd() {
      if (isServe) return;
      const config = injectBuildConfig({ ...options, outDir });
      const result = await build({ ...config, build: { ...config.build, write: false } });
      const outputs = (Array.isArray(result) ? result : [result]) as Rolldown.RolldownOutput[];
      const items = outputs.flatMap(({ output }) => output);

      for (const item of items) {
        if (item.type !== 'chunk') continue;
        for (const id of item.moduleIds) {
          if (!id.startsWith('\0') && !id.includes('/node_modules/')) this.addWatchFile(id);
        }
      }
      files = items.map(item => ({
        fileName: item.fileName,
        source: item.type === 'chunk' ? item.code : item.source,
      }));
    },
    generateBundle() {
      if (isServe) return;
      for (const { fileName, source } of files) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
    writeBundle() {
      if (isServe) return;
      // crx() writes the manifest; expose inject.js to pages after it has.
      const manifestPath = resolve(outDir, 'manifest.json');
      const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
      manifest.web_accessible_resources = [
        ...(manifest.web_accessible_resources ?? []),
        { resources: [INJECT_SCRIPT], matches: ['<all_urls>'] },
      ];
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
  };
};

// Real environment variables (CI secrets) take precedence over the local .env file.
const web3AuthDefine = (mode: string): Record<string, string> => {
  const env = loadEnv(mode, root, '');
  return Object.fromEntries(
    WEB3AUTH_ENV_KEYS.map(key => [`process.env.${key}`, JSON.stringify(env[key] ?? '')]),
  );
};

/**
 * Builds the Chrome target by default (`dist`). `-- --browser=firefox` builds the
 * Firefox target (`dist-firefox`) from the same manifest plus the keys in
 * `manifest.firefox.json`, which Firefox needs differently.
 */
export default defineConfig(({ mode, command }) => {
  const isFirefox = process.argv.includes('--browser=firefox');
  const isStorybook = process.argv[1]?.includes('storybook');
  const isProduction = mode === 'production';
  // `vite build` defaults to a production React build; development keeps the
  // dev runtime and readable output, as `webpack --mode=development` did.
  if (!isProduction) process.env.NODE_ENV = 'development';
  const minify = isProduction;
  const outDir = resolve(root, isFirefox ? 'dist-firefox' : 'dist');
  const target = isFirefox ? 'firefox115' : 'chrome100';
  // Shipped source maps would hand out the wallet's readable sources.
  const sourcemap = !isProduction;

  const isDevServer = command === 'serve' && !isStorybook;

  if (process.env[INJECT_WATCH_ENV]) {
    const config = injectBuildConfig({ mode, target, sourcemap, minify, define: web3AuthDefine(mode), outDir });
    return { ...config, logLevel: 'info', build: { ...config.build, watch: {} } };
  }

  const manifest = buildManifest(isFirefox ? 'firefox' : 'chrome');
  if (isDevServer) allowDevServer(manifest, DEV_SERVER_PORT);

  const define = web3AuthDefine(mode);

  return {
    plugins: [
      react(),
      polyfills(),
      ...(isStorybook
        ? []
        : [
            crx({ manifest: manifest as unknown as ManifestV3Export, browser: isFirefox ? 'firefox' : 'chrome' }),
            viteStaticCopy({
              targets: [{ src: 'src/resources/**/*', dest: 'resources', rename: { stripBase: 2 } }],
            }),
            injectScript({ mode, target, sourcemap, minify, define }),
            devNodeGlobals(DEV_ENTRIES.map(entry => resolve(root, entry))),
            devUmdLottie(),
          ]),
    ],
    server: {
      port: DEV_SERVER_PORT,
      strictPort: true,
      // Extension pages are not served from the dev server's origin, so the
      // HMR client has to be told where to connect.
      hmr: { protocol: 'ws', host: 'localhost', port: DEV_SERVER_PORT },
    },
    // Dependencies are pre-bundled for the dev server outside the plugin
    // pipeline above, so they need the polyfills too.
    optimizeDeps: {
      rolldownOptions: {
        plugins: [polyfills()],
      },
    },
    resolve: { alias },
    define,
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 0,
      sourcemap,
      minify,
      target,
      chunkSizeWarningLimit: MAX_CHUNK_SIZE / 1024,
      rolldownOptions: {
        input: {
          register: resolve(root, 'register.html'),
          security: resolve(root, 'security.html'),
        },
        output: {
          codeSplitting: {
            maxSize: MAX_CHUNK_SIZE,
          },
        },
      },
    },
  };
});
