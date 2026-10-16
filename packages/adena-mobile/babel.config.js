module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // Shared extension code uses `export * as name from` (inject/message, services).
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
