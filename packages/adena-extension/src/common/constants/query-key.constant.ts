/**
 * Query keys for the wallet's lock state.
 *
 * `wallet/existWallet` and `wallet/locked` read local/session storage rather
 * than the chain, but they still inherit the app-wide query defaults (10s
 * staleTime, no refetch on window focus). That makes them behave like a cached
 * snapshot: once a value lands in the cache nothing re-reads it on its own, so
 * every place that changes the underlying storage has to write the new value
 * back. `WalletProvider.initWallet` is that place.
 *
 * Kept out of `@hooks/use-wallet` so the provider can import the keys without
 * pulling the hook (and the provider barrel it re-imports) into a cycle.
 */
export const WALLET_EXISTS_QUERY_KEY = 'wallet/existWallet';
export const WALLET_LOCKED_QUERY_KEY = 'wallet/locked';

export const makeWalletExistsQueryKey = (walletServiceId: string): [string, string] => [
  WALLET_EXISTS_QUERY_KEY,
  walletServiceId,
];

export const makeWalletLockedQueryKey = (walletServiceId: string): [string, string] => [
  WALLET_LOCKED_QUERY_KEY,
  walletServiceId,
];
