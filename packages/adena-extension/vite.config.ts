import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { crx, type ManifestV3Export } from '@crxjs/vite-plugin';
import nodePolyfills from '@rolldown/plugin-node-polyfills';
import react from '@vitejs/plugin-react';
import { build, defineConfig, loadEnv, type Plugin } from 'vite';
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
  'lottie-web': resolve(root, 'libs/lottie_light.min.js'),
};

// Must resolve node built-ins (crypto, Buffer, ...) before Vite externalizes them.
const polyfills = (): Plugin => ({ ...nodePolyfills(), enforce: 'pre' }) as Plugin;

/**
 * content.ts loads `inject.js` into the page as a classic script, so it has to be
 * one self-contained file. crx()'s own IIFE build runs without plugins and would
 * drop the node polyfills, hence this separate build.
 */
const injectScript = (options: {
  outDir: string;
  mode: string;
  target: string;
  sourcemap: boolean;
  define: Record<string, string>;
}): Plugin => ({
  name: 'adena:inject-script',
  apply: 'build',
  async closeBundle() {
    await build({
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
        target: options.target,
        lib: {
          entry: resolve(root, 'src/inject.ts'),
          formats: ['iife'],
          name: 'adenaInject',
          fileName: () => INJECT_SCRIPT,
        },
      },
    });

    const manifestPath = resolve(options.outDir, 'manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.web_accessible_resources = [
      ...(manifest.web_accessible_resources ?? []),
      { resources: [INJECT_SCRIPT], matches: ['<all_urls>'] },
    ];
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  },
});

/**
 * Builds the Chrome target by default (`dist`). `-- --browser=firefox` builds the
 * Firefox target (`dist-firefox`) from the same manifest plus the keys in
 * `manifest.firefox.json`, which Firefox needs differently.
 */
export default defineConfig(({ mode }) => {
  const isFirefox = process.argv.includes('--browser=firefox');
  const isStorybook = process.argv[1]?.includes('storybook');
  const isProduction = mode === 'production';
  const outDir = resolve(root, isFirefox ? 'dist-firefox' : 'dist');
  const target = isFirefox ? 'firefox115' : 'chrome100';
  // Shipped source maps would hand out the wallet's readable sources.
  const sourcemap = !isProduction;

  const manifest = buildManifest(isFirefox ? 'firefox' : 'chrome') as unknown as ManifestV3Export;

  // Real environment variables (CI secrets) take precedence over the local .env file.
  const env = loadEnv(mode, root, '');
  const define = Object.fromEntries(
    WEB3AUTH_ENV_KEYS.map(key => [`process.env.${key}`, JSON.stringify(env[key] ?? '')]),
  );

  return {
    plugins: [
      react(),
      polyfills(),
      ...(isStorybook
        ? []
        : [
            crx({ manifest, browser: isFirefox ? 'firefox' : 'chrome' }),
            viteStaticCopy({
              targets: [{ src: 'src/resources/**/*', dest: 'resources', rename: { stripBase: 2 } }],
            }),
            injectScript({ outDir, mode, target, sourcemap, define }),
          ]),
    ],
    resolve: { alias },
    define,
    build: {
      outDir,
      emptyOutDir: true,
      assetsInlineLimit: 0,
      sourcemap,
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
