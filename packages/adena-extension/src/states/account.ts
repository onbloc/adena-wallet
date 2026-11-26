import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { atomFamily } from 'jotai-family';

import { wallet } from './wallet';

/**
 * Bulk variant for per-account loops (e.g., balance fetching across all accounts).
 * Returns Record<accountId, address> for the given prefix.
 */
export const accountAddressesByPrefix = atomFamily((prefix: string) =>
  atom(async (get): Promise<Record<string, string>> => {
    const walletInstance = get(wallet);
    if (!walletInstance) return {};
    const entries = await Promise.all(
      walletInstance.accounts.map(async a => [a.id, await a.getAddress(prefix)] as const),
    );
    return Object.fromEntries(entries);
  }),
);

/**
 * Non-suspending view of `accountAddressesByPrefix`: null while the addresses
 * resolve or when the derivation fails, the value once it settles.
 */
export const accountAddressesByPrefixOrNull = atomFamily((prefix: string) =>
  unwrap(
    atom(async (get): Promise<Record<string, string> | null> => {
      try {
        return await get(accountAddressesByPrefix(prefix));
      }
      catch {
        return null;
      }
    }),
    () => null,
  ),
);
