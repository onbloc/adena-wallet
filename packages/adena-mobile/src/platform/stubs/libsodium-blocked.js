// Resolved instead of libsodium.js on mobile (see metro.config.js). Importing
// is allowed so shared modules load; using any function is a bug, because the
// native CryptoProvider must have been registered first.
const PASSTHROUGH = new Set([
  '__esModule',
  'default',
  'then',
  '$$typeof',
  'prototype',
]);

module.exports = new Proxy(
  {},
  {
    get(_target, property) {
      if (typeof property === 'symbol' || PASSTHROUGH.has(property)) {
        return undefined;
      }
      throw new Error(
        `libsodium.js (${String(
          property,
        )}) is not available on React Native; ` +
          'register the native CryptoProvider before using wallet crypto',
      );
    },
  },
);
