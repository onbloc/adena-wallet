// Bech32 human-readable prefix for Gno addresses (e.g. "g1...").
// Shared so session/address helpers don't each redefine the literal 'g'.
export const GNO_ADDRESS_PREFIX = 'g';

// Chain id on which the account-session feature is currently enabled during
// rollout. Kept in one place so it is easy to widen (or move into chains.json
// as a per-chain capability flag) when the feature ships to more networks.
export const SESSION_SUPPORTED_CHAIN_ID = 'test-13';
