import { useQuery } from '@tanstack/react-query';
import { isSessionAccount } from 'adena-module';
import { useMemo } from 'react';
import { useRecoilValueLoadable } from 'recoil';

import { selectBalanceAddress } from '@common/utils/account-address';
import { isRevokedSessionAccount } from '@common/utils/account-session';
import { AccountState } from '@states';
import { TokenBalanceType } from '@types';

import { useAdenaContext, useWalletContext } from './use-context';
import { useGRC20Tokens } from './use-grc20-tokens';
import { useNetwork } from './use-network';
import { useSessions } from './use-sessions';
import { useTokenMetainfo } from './use-token-metainfo';
import { useWallet } from './use-wallet';

const STALE_TIME = 5_000;

/**
 * Native balance of every account in the wallet, keyed by account id.
 *
 * Kept out of `useTokenBalance` so a consumer of this map does not also mount
 * the current account's Gno/Cosmos balance pollers. It costs one RPC per
 * account, so it is fetched only while `enabled` and never on an interval.
 */
export const useAccountNativeBalanceMap = (enabled: boolean): Record<string, TokenBalanceType> => {
  const { wallet } = useWalletContext();
  const { balanceService } = useAdenaContext();
  const { currentTokenMetainfos: tokenMetainfos, getTokenAmount } = useTokenMetainfo();
  const { isFetched: isFetchedGRC20Tokens } = useGRC20Tokens();
  const { currentNetwork } = useNetwork();
  const { sessions } = useSessions();
  const { existWallet, lockedWallet } = useWallet();

  const nativeToken = useMemo(
    () => tokenMetainfos.find((tokenModel) => tokenModel.main) ?? null,
    [tokenMetainfos],
  );

  const accountAddressesLoadable = useRecoilValueLoadable(
    AccountState.accountAddressesByPrefix(currentNetwork.addressPrefix),
  );
  const accountAddressesByAccountId =
    accountAddressesLoadable.state === 'hasValue' ? accountAddressesLoadable.contents : null;

  const revokedSessionAddrsKey = useMemo(
    () =>
      sessions
        .filter((session) => session.status === 'REVOKED')
        .map((session) => session.sessionAddr)
        .sort()
        .join('|'),
    [sessions],
  );

  const { data = {} } = useQuery<Record<string, TokenBalanceType>>(
    [
      'accountNativeBalanceMap',
      wallet?.accounts,
      currentNetwork.chainId,
      currentNetwork.addressPrefix,
      isFetchedGRC20Tokens,
      // A revoke moves a session row onto its own balance, so the map must refetch.
      revokedSessionAddrsKey,
    ],
    () => {
      if (
        wallet === null ||
        wallet.accounts === null ||
        nativeToken == null ||
        accountAddressesByAccountId === null
      ) {
        return {};
      }

      return Promise.all(
        wallet.accounts.map(async (account) => {
          // Same policy as the main screen: an ACTIVE session spends master
          // funds so its row shows the master's GNOT balance; a revoked one
          // shows the balance of the session key it still holds.
          const ownAddress = accountAddressesByAccountId[account.id];
          const fundingAddress = isSessionAccount(account)
            ? account.getMasterAddress()
            : ownAddress;
          const address = selectBalanceAddress(
            ownAddress,
            fundingAddress,
            isRevokedSessionAccount(account, ownAddress, sessions),
          );
          const balanceAmount = await balanceService.getGnotTokenBalance(address);
          return {
            ...nativeToken,
            amount: getTokenAmount({
              value: `${balanceAmount || 0}`,
              denom: nativeToken.symbol,
            }),
          } as TokenBalanceType;
        }),
      ).then((balances) =>
        balances.reduce<Record<string, TokenBalanceType>>((accum, current, index) => {
          if (wallet.accounts[index]?.id) {
            accum[wallet.accounts[index]?.id] = current;
          }
          return accum;
        }, {}),
      );
    },
    {
      staleTime: STALE_TIME,
      keepPreviousData: true,
      enabled:
        enabled &&
        existWallet &&
        !lockedWallet &&
        isFetchedGRC20Tokens &&
        tokenMetainfos.length > 0 &&
        accountAddressesByAccountId !== null,
    },
  );

  return data;
};
