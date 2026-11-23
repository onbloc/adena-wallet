// Minimal `crypto` replacement for SDK code paths that expect Node's module.
function randomFillSync(array) {
  globalThis.crypto.getRandomValues(array);
  return array;
}

function randomBytes(size) {
  return randomFillSync(new Uint8Array(size));
}

module.exports = { randomFillSync, randomBytes, default: { randomFillSync, randomBytes } };
