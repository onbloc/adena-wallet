const path = require('path');
const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');
const extensionSrc = path.resolve(
  workspaceRoot,
  'packages/adena-extension/src',
);

// Shared code from the extension, by the same aliases its tsconfig uses.
// UI-only folders (pages, components, router, ...) are deliberately absent.
const SHARED_ALIASES = {
  '@common/': path.join(extensionSrc, 'common/'),
  '@inject/': path.join(extensionSrc, 'inject/'),
  '@services/': path.join(extensionSrc, 'services/'),
  '@repositories/': path.join(extensionSrc, 'repositories/'),
  '@migrates/': path.join(extensionSrc, 'migrates/'),
  '@resources/': path.join(extensionSrc, 'resources/'),
  '@hooks/': path.join(extensionSrc, 'hooks/'),
  '@states': path.join(extensionSrc, 'states'),
  '@types': path.join(extensionSrc, 'types'),
  // Design: the token file (plain values) and the image/animation assets.
  // The extension's styled components stay out of the mobile bundle.
  '@styles/tokens': path.join(extensionSrc, 'styles/tokens'),
  '@assets/': path.join(extensionSrc, 'assets/'),
};

// Modules that must never run on mobile: libsodium.js is WASM (Hermes cannot
// run it, and the native CryptoProvider replaces it), Node's `crypto` does not
// exist, and the Ledger stack is browser-only. They resolve to stubs that fail
// loudly if anything calls them.
const BLOCKED_MODULES = {
  'libsodium-wrappers-sumo': path.join(
    projectRoot,
    'src/platform/stubs/libsodium-blocked.js',
  ),
  'libsodium-wrappers': path.join(
    projectRoot,
    'src/platform/stubs/libsodium-blocked.js',
  ),
  crypto: path.join(projectRoot, 'src/platform/stubs/node-crypto-empty.js'),
  // Browser-only Ledger stack; mobile gets a BLE transport in M2.
  '@ledgerhq/hw-transport': path.join(
    projectRoot,
    'src/platform/stubs/ledger-unavailable.js',
  ),
  '@ledgerhq/hw-transport-webhid': path.join(
    projectRoot,
    'src/platform/stubs/ledger-unavailable.js',
  ),
  '@ledgerhq/hw-transport-webusb': path.join(
    projectRoot,
    'src/platform/stubs/ledger-unavailable.js',
  ),
  '@ledgerhq/hw-transport-mocker': path.join(
    projectRoot,
    'src/platform/stubs/ledger-unavailable.js',
  ),
  '@cosmjs/ledger-amino': path.join(
    projectRoot,
    'src/platform/stubs/cosmjs-ledger-unavailable.js',
  ),
  'ledger-cosmos-js': path.join(
    projectRoot,
    'src/platform/stubs/ledger-unavailable.js',
  ),
};

// One copy of the libraries that hold global state, whichever package imports them.
const SINGLETONS = ['react', 'react-native', 'recoil', '@tanstack/react-query'];

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  watchFolders: [workspaceRoot],
  transformer: {
    // `import Icon from '@assets/x.svg'` yields a react-native-svg component,
    // the same shape the extension's webpack SVG loader gives it.
    babelTransformerPath: require.resolve(
      'react-native-svg-transformer/react-native',
    ),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
    // Subpath imports such as `@bufbuild/protobuf/wire` rely on "exports".
    unstable_enablePackageExports: true,
    nodeModulesPaths: [
      path.join(projectRoot, 'node_modules'),
      path.join(workspaceRoot, 'node_modules'),
    ],
    resolveRequest: (context, moduleName, platform) => {
      if (BLOCKED_MODULES[moduleName]) {
        return {type: 'sourceFile', filePath: BLOCKED_MODULES[moduleName]};
      }
      if (moduleName === 'adena-module') {
        return context.resolveRequest(
          context,
          path.join(workspaceRoot, 'packages/adena-module/index.ts'),
          platform,
        );
      }
      for (const [alias, target] of Object.entries(SHARED_ALIASES)) {
        if (
          moduleName === alias.replace(/\/$/, '') ||
          moduleName.startsWith(alias)
        ) {
          return context.resolveRequest(
            context,
            target + moduleName.slice(alias.length),
            platform,
          );
        }
      }
      const singleton = SINGLETONS.find(
        name => moduleName === name || moduleName.startsWith(`${name}/`),
      );
      if (singleton) {
        return context.resolveRequest(
          {...context, originModulePath: path.join(projectRoot, 'index.js')},
          moduleName,
          platform,
        );
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
