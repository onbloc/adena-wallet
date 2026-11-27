module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // zod v4 (AI SDK) ships ESM that uses `export * as ns from`, which the React Native preset does not transform.
  plugins: ['@babel/plugin-transform-export-namespace-from'],
};
