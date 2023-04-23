import { BalanceState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useNetwork } from './use-network';
import { useCurrentAccount } from './use-current-account';
import { AccountTokenBalance, Amount, TokenBalance } from '@states/balance';
import { Account } from 'adena-module';
import { TokenMetainfo } from '@states/token';
import { useGnoClient } from './use-gno-client';
import { useAdenaContext } from './use-context';
import { useTokenMetainfo } from './use-token-metainfo';

export const useTokenBalance = (): {
  mainTokenBalance: Amount | undefined;
  tokenBalances: TokenBalance[];
  accountTokenBalances: AccountTokenBalance[];
  updateBalanceByAccountAndToken: (account: Account, token: TokenMetainfo) => Promise<void>;
  updateMainBalanceByAccount: (account: Account) => Promise<void>;
} => {
  const [gnoClient] = useGnoClient();
  const { tokenMetainfos } = useTokenMetainfo();
  const { balanceService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const [accountTokenBalances, setAccountTokenBalances] = useRecoilState(
    BalanceState.accountTokenBalances,
  );

  function matchChainIdAndNetworkId(accountTokenBalance: AccountTokenBalance) {
    return (
      accountTokenBalance.chainId === currentNetwork?.chainId &&
      accountTokenBalance.networkId === currentNetwork?.networkId
    );
  }

  function matchCurrentAccount(accountTokenBalance: AccountTokenBalance) {
    return (
      accountTokenBalance.accountId === currentAccount?.id &&
      matchChainIdAndNetworkId(accountTokenBalance)
    );
  }

  async function updateMainBalanceByAccount(account: Account) {
    const mainToken = tokenMetainfos.find((metainfo) => metainfo.main);
    if (mainToken) {
      updateBalanceByAccountAndToken(account, mainToken);
    }
  }

  async function updateBalanceByAccountAndToken(account: Account, token: TokenMetainfo) {
    if (!gnoClient) {
      return;
    }
    const prefix = currentNetwork?.addressPrefix ?? 'g';
    const balances = await balanceService.getTokenBalances(gnoClient, account.getAddress(prefix));
    if (balances.length === 0) {
      return;
    }

    const accountBalanceIndex = accountTokenBalances.findIndex(
      (accountTokenBalance) =>
        accountTokenBalance.accountId === account.id &&
        matchChainIdAndNetworkId(accountTokenBalance),
    );

    let changedAccountTokenBalances = [...accountTokenBalances];
    if (accountBalanceIndex < 0) {
      changedAccountTokenBalances.push({
        accountId: account.id,
        chainId: token.chainId,
        networkId: token.networkId,
        tokenBalances: tokenMetainfos.map((metainfo) => {
          return {
            ...metainfo,
            amount: balances[0].amount,
          };
        }),
      });
    } else {
      changedAccountTokenBalances = accountTokenBalances.map((accountTokenBalance) => {
        if (
          accountTokenBalance.accountId === account.id &&
          matchChainIdAndNetworkId(accountTokenBalance)
        ) {
          return {
            ...accountTokenBalance,
            tokenBalances: accountTokenBalance.tokenBalances.map((tokenBalance) => {
              if (tokenBalance.tokenId === token.tokenId) {
                return {
                  ...tokenBalance,
                  amount: balances[0].amount,
                };
              }
              return tokenBalance;
            }),
          };
        }
        return accountTokenBalance;
      });
    }
    setAccountTokenBalances(changedAccountTokenBalances);
  }

  return {
    mainTokenBalance: accountTokenBalances
      .find(matchCurrentAccount)
      ?.tokenBalances.find((tokenBalance) => tokenBalance.type === 'NATIVE')?.amount,
    tokenBalances: accountTokenBalances.find(matchCurrentAccount)?.tokenBalances ?? [],
    accountTokenBalances: accountTokenBalances.filter(matchChainIdAndNetworkId),
    updateBalanceByAccountAndToken,
    updateMainBalanceByAccount,
  };
};
