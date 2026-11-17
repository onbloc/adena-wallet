// Node's `crypto` does not exist on React Native. adena-module treats an empty
// module as "unavailable" and falls back to Web Crypto / @noble.
module.exports = {};
