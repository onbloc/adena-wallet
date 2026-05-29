import { Account, ChainProfile, isSessionAccount } from 'adena-module';
import { useQuery } from '@tanstack/react-query';
import { useAdenaContext, useWalletContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export interface ChainAddressEntry {
  chain: ChainProfile;
  address: string;
  id?: string;
  label?: string;
}

interface UseAccountChainAddressesOptions {
  sessionAddressMode?: 'funding' | 'session';
}

/**
 * Returns the current account's address for each registered chain group.
 * One entry per group (Gno.land, AtomOne, etc.) using the mainnet-default profile.
 *
 * For SessionAccount: the Gno entry uses the master Gno address (sessions never
 * hold funds and never receive deposits). Non-Gno entries derive from the master
 * account object when it can be located in the wallet; otherwise the chain entry
 * is dropped because the session has no key material to derive a non-Gno address.
 *
 * React Query memoizes results per account so the popover does not re-derive
 * addresses on every open.
 */
export const useAccountChainAddresses = (
  options: UseAccountChainAddressesOptions = {},
): ChainAddressEntry[] => {
  const { chainRegistry } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { wallet } = useWalletContext();
  const { sessionAddressMode = 'funding' } = options;

  const chainGroups = [...new Set(chainRegistry.list().map((p) => p.chainGroup))];
  const profiles = chainGroups
    .map((g) => chainRegistry.getDefault(g))
    .filter((p): p is ChainProfile => p !== undefined);

  const { data: entries = [] } = useQuery<ChainAddressEntry[]>(
    [
      'accountChainAddresses',
      currentAccount?.id,
      wallet?.accounts.length ?? 0,
      sessionAddressMode,
    ],
    async () => {
      if (!currentAccount) return [];

      const isSession = isSessionAccount(currentAccount);
      const masterAddress = isSession ? currentAccount.getMasterAddress() : null;
      const sessionAddress =
        isSession && sessionAddressMode === 'session'
          ? await currentAccount.getAddress('g').catch(() => null)
          : null;
      let masterAccount: Account | null = null;
      if (isSession && masterAddress && wallet) {
        for (const a of wallet.accounts) {
          if (isSessionAccount(a)) continue;
          const addr = await a.getAddress('g');
          if (addr === masterAddress) {
            masterAccount = a;
            break;
          }
        }
      }

      const entries = await Promise.all(
        profiles.map(async (profile) => {
          const chain = chainRegistry.getChain(profile.chainGroup);
          if (!chain) return null;

          if (isSession) {
            if (sessionAddressMode === 'session') {
              if (profile.chainGroup !== 'gno' || !sessionAddress) {
                return null;
              }
              return [{ chain: profile, address: sessionAddress }];
            }
            if (profile.chainGroup === 'gno' && masterAddress) {
              return [{ chain: profile, address: masterAddress }];
            }
            if (!masterAccount) {
              return null;
            }
            const address = await masterAccount.getAddress(chain.bech32Prefix);
            return [{ chain: profile, address }];
          }

          const address = await currentAccount.getAddress(chain.bech32Prefix);
          return [{ chain: profile, address }];
        }),
      );
      return entries
        .flat()
        .filter((e): e is ChainAddressEntry => e !== null);
    },
    { enabled: !!currentAccount },
  );

  return entries;
};
