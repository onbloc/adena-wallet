import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Account, isSessionAccount } from 'adena-module';

import { GNO_ADDRESS_PREFIX as GNO_PREFIX } from '@common/constants/chain.constant';
import { GnoSessionAccountResponse } from '@common/provider/gno/types';
import { isSessionSupportedNetwork } from '@common/utils/account-session';
import { useWalletContext } from './use-context';
import { useNetwork } from './use-network';

const MASTER_BADGE_REFETCH_INTERVAL = 30_000;

export const useMasterAccountBadgeMap = (accounts: Account[]): Record<string, boolean> => {
  const { gnoProvider } = useWalletContext();
  const { currentNetwork } = useNetwork();
  const supported = isSessionSupportedNetwork(currentNetwork);

  const queryAccountsKey = useMemo(
    () => accounts.map((account) => account.id).join('|'),
    [accounts],
  );

  const { data = {} } = useQuery<Record<string, boolean>>(
    ['masterAccountBadgeMap', currentNetwork.chainId, queryAccountsKey],
    async () => {
      if (!gnoProvider || !supported) {
        return {};
      }

      const entries = await Promise.all(
        accounts.map(async (account) => {
          if (isSessionAccount(account)) {
            return [account.id, false] as const;
          }

          try {
            const address = await account.getAddress(GNO_PREFIX);
            const sessions = await gnoProvider.getSessions(address);
            return [account.id, hasActiveSession(sessions)] as const;
          } catch {
            return [account.id, false] as const;
          }
        }),
      );

      return entries.reduce<Record<string, boolean>>((accum, [accountId, hasSession]) => {
        accum[accountId] = hasSession;
        return accum;
      }, {});
    },
    {
      enabled: supported && accounts.length > 0,
      refetchInterval: MASTER_BADGE_REFETCH_INTERVAL,
      staleTime: MASTER_BADGE_REFETCH_INTERVAL,
    },
  );

  return data;
};

function hasActiveSession(sessions: GnoSessionAccountResponse[]): boolean {
  const nowSec = Math.floor(Date.now() / 1000);
  return sessions.some((session) => {
    const expiresAt = Number(session.BaseSessionAccount.expires_at ?? 0);
    return expiresAt <= 0 || nowSec < expiresAt;
  });
}
