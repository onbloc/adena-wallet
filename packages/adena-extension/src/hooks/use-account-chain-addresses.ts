import { useQuery } from '@tanstack/react-query';
import { ChainProfile, isSessionAccount } from 'adena-module';
import { useAdenaContext } from './use-context';
import { useCurrentAccount } from './use-current-account';

export interface ChainAddressEntry {
  chain: ChainProfile;
  address: string;
  id?: string;
  label?: string;
}

/**
 * Returns the current account's address for each registered chain group.
 * One entry per group (Gno.land, AtomOne, etc.) using the mainnet-default profile.
 *
 * For SessionAccount only the Gno entry is returned, and it carries the MASTER
 * address: a session never holds funds and never receives deposits (tokens sent
 * there would be stranded), so every surface that shows a receivable address —
 * the header address popover and the Deposit screens — must show the master.
 * Non-Gno groups (AtomOne) are hidden entirely because a session has no key
 * material to derive an address for them.
 *
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

  // `profiles` is derived from the registry, which is re-registered on network
  // change. It must be part of the key or a stale entry list survives the switch.
  const profilesKey = profiles.map((profile) => profile.id).join('|');

  const { data: entries = [] } = useQuery<ChainAddressEntry[]>(
    ['accountChainAddresses', currentAccount?.id, profilesKey],
    async () => {
      if (!currentAccount) return [];

      if (isSessionAccount(currentAccount)) {
        const gnoProfile = profiles.find((profile) => profile.chainGroup === 'gno');
        if (!gnoProfile) return [];
        return [{ chain: gnoProfile, address: currentAccount.getMasterAddress() }];
      }

      const resolved = await Promise.all(
        profiles.map(async (profile) => {
          const chain = chainRegistry.getChain(profile.chainGroup);
          if (!chain) return null;

          const address = await currentAccount.getAddress(chain.bech32Prefix);
          return { chain: profile, address };
        }),
      );
      return resolved.filter((entry): entry is ChainAddressEntry => entry !== null);
    },
    { enabled: !!currentAccount },
  );

  return entries;
};
