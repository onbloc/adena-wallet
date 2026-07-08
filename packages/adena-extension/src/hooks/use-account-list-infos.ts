import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { Account } from 'adena-module';
import { useMemo } from 'react';

import { getWalletFundingAddress } from '@common/utils/account-address';
import { formatNickname } from '@common/utils/client-utils';
import { SideMenuAccountInfo, TokenBalanceType } from '@types';

import { useAccountName } from './use-account-name';
import { useChain } from './use-chain';
import { useMasterAccountBadgeMap } from './use-master-account-badge-map';
import { useTokenBalance } from './use-token-balance';

const ACCOUNT_LIST_INFOS_STALE_TIME = 3_000;

const buildAccountListInfos = async (
  accounts: Account[],
  accountNames: Record<string, string>,
  accountNativeBalanceMap: Record<string, TokenBalanceType>,
  masterAccountBadgeMap: Record<string, boolean>,
  addressPrefix: string,
): Promise<SideMenuAccountInfo[]> => {
  const mapBalance = (account: Account): string => {
    const amount = accountNativeBalanceMap[account.id]?.amount;
    if (!amount) {
      return '-';
    }
    return `${amount.value}`;
  };

  return Promise.all(
    accounts.map(async (account) => ({
      accountId: account.id,
      name: formatNickname(accountNames[account.id] || account.name, 10),
      // A SessionAccount row shows the master address — the one that holds the
      // balance rendered next to it, and the only address worth copying or
      // opening on GnoScan. Its own session address stays internal.
      address: await getWalletFundingAddress(account, addressPrefix),
      type: account.type,
      balance: mapBalance(account),
      badgeLabel: masterAccountBadgeMap[account.id] ? 'Master' : undefined,
    })),
  );
};

export const useAccountListInfos = (
  accounts: Account[],
): UseQueryResult<SideMenuAccountInfo[], unknown> => {
  const { accountNames } = useAccountName();
  const chain = useChain();
  const { accountNativeBalanceMap } = useTokenBalance();
  const masterAccountBadgeMap = useMasterAccountBadgeMap(accounts);

  const accountIdsKey = useMemo(() => accounts.map((account) => account.id).join('|'), [accounts]);

  return useQuery<SideMenuAccountInfo[]>(
    [
      'accountListInfos',
      accountIdsKey,
      accountNames,
      accountNativeBalanceMap,
      masterAccountBadgeMap,
      chain.bech32Prefix,
    ],
    () =>
      buildAccountListInfos(
        accounts,
        accountNames,
        accountNativeBalanceMap,
        masterAccountBadgeMap,
        chain.bech32Prefix,
      ),
    {
      enabled: accounts.length > 0,
      keepPreviousData: true,
      staleTime: ACCOUNT_LIST_INFOS_STALE_TIME,
    },
  );
};
