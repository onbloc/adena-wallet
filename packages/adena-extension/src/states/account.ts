import { selectorFamily } from 'recoil';

import { wallet } from './wallet';

/**
 * Address derivation memoized per (accountId, prefix).
 * Invalidates automatically when the wallet atom changes.
 */
export const accountAddressSelector = selectorFamily<
  string | null,
  { accountId: string; prefix: string }
>({
  key: 'account/addressByPrefix',
  get:
    ({ accountId, prefix }) =>
    async ({ get }) => {
      const walletInstance = get(wallet);
      const account = walletInstance?.accounts.find((a) => a.id === accountId);
      if (!account) return null;
      return account.getAddress(prefix);
    },
});

/**
 * Bulk variant for per-account loops (e.g., balance fetching across all accounts).
 * Returns Record<accountId, address> for the given prefix.
 */
export const accountAddressesByPrefix = selectorFamily<Record<string, string>, string>({
  key: 'account/addressesByPrefix',
  get:
    (prefix) =>
    async ({ get }) => {
      const walletInstance = get(wallet);
      if (!walletInstance) return {};
      const entries = await Promise.all(
        walletInstance.accounts.map(async (a) => [a.id, await a.getAddress(prefix)] as const),
      );
      return Object.fromEntries(entries);
    },
});
