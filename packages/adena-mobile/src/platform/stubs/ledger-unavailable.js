// Resolved instead of the browser Ledger stack on mobile (see metro.config.js).
// adena-module loads it eagerly, but WebHID/WebUSB do not exist on a phone and
// its Node-stream dependencies do not run on Hermes. Ledger on mobile arrives
// with a BLE transport (milestone M2); until then any use fails loudly.
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
        `Ledger (${String(property)}) is not available on mobile yet`,
      );
    },
  },
);
