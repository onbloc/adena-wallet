import type { StorybookConfig } from '@storybook/react-native-web-vite';
import svgr from 'vite-plugin-svgr';

// Web Storybook: React Native components rendered through react-native-web.
// Native-only modules (keychain, MMKV, biometrics) are out of scope; pages take props only.
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },
  staticDirs: [{ from: '../src/assets/fonts', to: '/fonts' }],
  viteFinal: async (viteConfig) => {
    // vite-plugin-rnw shims missing exports for `build` only. Native-only imports such as
    // react-native-svg's TurboModuleRegistry spec would otherwise stop the dev optimizer.
    viteConfig.optimizeDeps = {
      ...viteConfig.optimizeDeps,
      rolldownOptions: { ...viteConfig.optimizeDeps?.rolldownOptions, shimMissingExports: true },
    };
    // Same `import Logo from './logo.svg'` component imports as react-native-svg-transformer.
    viteConfig.plugins = [...(viteConfig.plugins ?? []), svgr({ include: '**/*.svg', svgrOptions: { exportType: 'default' } })];

    return viteConfig;
  },
};

export default config;
