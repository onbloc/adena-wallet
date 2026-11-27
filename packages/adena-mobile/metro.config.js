const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

// Standalone project: every dependency lives in this package's node_modules.
const projectRoot = __dirname;

// Node-only modules pulled in by the Gno SDKs are mapped to RN-safe shims.
const moduleShims = {
  crypto: path.resolve(projectRoot, 'src/shims/crypto.js'),
};

// The AI assistant library is a sibling package linked through node_modules (`link:../adena-ai`).
// Its own node_modules (Expo test app, a second React Native) must stay invisible so the app keeps one copy of each runtime.
const aiPackageRoot = path.resolve(projectRoot, '../adena-ai');
const aiNodeModules = new RegExp(`^${aiPackageRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/node_modules/.*$`);

const defaultConfig = getDefaultConfig(projectRoot);

/** @type {import('@react-native/metro-config').MetroConfig} */
const config = {
  watchFolders: [aiPackageRoot],
  // SVG assets are imported as components (react-native-svg-transformer).
  transformer: {
    babelTransformerPath: require.resolve('react-native-svg-transformer/react-native'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
    nodeModulesPaths: [path.resolve(projectRoot, 'node_modules')],
    blockList: [defaultConfig.resolver.blockList, aiNodeModules],
    resolveRequest: (context, moduleName, platform) => {
      if (moduleShims[moduleName]) {
        return { type: 'sourceFile', filePath: moduleShims[moduleName] };
      }

      return context.resolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = mergeConfig(defaultConfig, config);
