module.exports = {
  root: true,
  extends: '@react-native',
  rules: {
    // Mobile shares the extension's logic, not its UI or its WASM crypto.
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'libsodium-wrappers-sumo',
            message:
              'Use getCryptoProvider() from adena-module; Hermes cannot run libsodium.js.',
          },
          {
            name: 'libsodium-wrappers',
            message:
              'Use getCryptoProvider() from adena-module; Hermes cannot run libsodium.js.',
          },
        ],
        patterns: [
          {
            group: [
              '@pages/*',
              '@components/*',
              '@router/*',
              '@styles/*',
              '!@styles/tokens',
              '@ui/*',
            ],
            message:
              'Extension UI is not shared with mobile (only @styles/tokens and @assets are).',
          },
          {
            // Extension icon-*.tsx components render DOM <svg>; mobile takes
            // the .svg files (react-native-svg) and Lottie .json instead.
            group: [
              '@assets/**',
              '!@assets/**/',
              '!@assets/**/*.svg',
              '!@assets/**/*.json',
              '!@assets/**/*.png',
            ],
            message: 'Import .svg or .json assets; extension icon components are DOM-only.',
          },
          {
            group: ['**/adena-extension/**'],
            message:
              'Import shared extension code through the @common/@inject/... aliases.',
          },
        ],
      },
    ],
    'no-restricted-properties': [
      'error',
      {
        object: 'Math',
        property: 'random',
        message: 'Not a CSPRNG. Use getCryptoProvider().randomBytes.',
      },
    ],
  },
  overrides: [
    {
      files: ['__tests__/**', '__mocks__/**', 'jest.setup.js'],
      env: {jest: true, es2020: true},
      rules: {'no-restricted-imports': 'off'},
    },
  ],
};
