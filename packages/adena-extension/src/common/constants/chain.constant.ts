// Bech32 human-readable prefix for Gno addresses (e.g. "g1...").
// Shared so session/address helpers don't each redefine the literal 'g'.
export const GNO_ADDRESS_PREFIX = 'g';

// Chains where the account-session feature must stay off. Everything else is
// treated as supported, so a newly added (or custom) gno chain opts in by
// default. Single source of truth: `isSessionSupportedNetwork` and
// `isSessionSupportedChainId` in @common/utils/account-session are the only
// readers.
export const SESSION_UNSUPPORTED_CHAIN_IDS: readonly string[] = ['gnoland1'];
