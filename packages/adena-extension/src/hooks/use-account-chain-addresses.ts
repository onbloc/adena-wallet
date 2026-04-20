import { ChainProfile } from 'adena-module';
import { useQuery } from '@tanstack/react-query';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export interface ChainAddressEntry {
  chain: ChainProfile;
  address: string;
}

/**
 * Returns the current account's address for each registered chain group.
 * One entry per group (Gno.land, AtomOne, etc.) using the mainnet-default profile.
 * React Query memoizes results per account so the popover does not re-derive
 * addresses on every open.
 */
export const useAccountChainAddresses = (): ChainAddressEntry[] => {
  const { chainRegistry } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();

  const chainGroups = [...new Set(chainRegistry.list().map((p) => p.chainGroup))];
  const profiles = chainGroups
    .map((g) => chainRegistry.getDefault(g))
    .filter((p): p is ChainProfile => p !== undefined);

  const { data: entries = [] } = useQuery<ChainAddressEntry[]>(
    ['accountChainAddresses', currentAccount?.id],
    async () => {
      if (!currentAccount) return [];
      const entries = await Promise.all(
        profiles.map(async (profile) => {
          const chain = chainRegistry.getChain(profile.chainGroup);
          if (!chain) return null;
          const address = await currentAccount.getAddress(chain.bech32Prefix);
          return { chain: profile, address };
        }),
      );
      return entries.filter((e): e is ChainAddressEntry => e !== null);
    },
    { enabled: !!currentAccount },
  );

  return entries;
};
