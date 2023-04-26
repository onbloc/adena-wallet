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
import { useEffect } from 'react';

export const useTokenBalance = (): {
  mainTokenBalance: Amount | undefined;
  tokenBalances: TokenBalance[];
  displayTokenBalances: TokenBalance[];
  accountTokenBalances: AccountTokenBalance[];
  fetchBalanceBy: (account: Account, token: TokenMetainfo) => Promise<TokenBalance>;
  toggleDisplayOption: (account: Account, token: TokenMetainfo, activated: boolean) => void;
  updateBalanceAmountByAccount: (account: Account) => Promise<boolean>;
  updateMainBalanceByAccount: (account: Account) => Promise<boolean>;
  updateTokenBalanceInfos: (tokenMetainfos: TokenBalance[]) => Promise<boolean>;
} => {
  const [gnoClient] = useGnoClient();
  const { tokenMetainfos } = useTokenMetainfo();
  const { balanceService, tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const [accountTokenBalances, setAccountTokenBalances] = useRecoilState(
    BalanceState.accountTokenBalances,
  );

  useEffect(() => {
    updateTokenBalanceInfos(tokenMetainfos);
  }, [tokenMetainfos]);

  function matchChainIdAndNetworkId(accountTokenBalance: AccountTokenBalance) {
    return (
      accountTokenBalance.chainId === currentNetwork?.chainId &&
      accountTokenBalance.networkId === currentNetwork?.networkId
    );
  }

  function matchCurrentAccount(account: Account | null, accountTokenBalance: AccountTokenBalance) {
    if (!account) return false;
    return (
      accountTokenBalance.accountId === account.id && matchChainIdAndNetworkId(accountTokenBalance)
    );
  }

  function getTokenBalances() {
    const currentAccountToken = accountTokenBalances.find((accountTokenBalance) =>
      matchCurrentAccount(currentAccount, accountTokenBalance),
    );
    if (!currentAccountToken) {
      return [];
    }
    return currentAccountToken.tokenBalances;
  }

  async function updateTokenBalanceInfos(tokenMetainfos: TokenMetainfo[]) {
    if (!currentAccount || !currentNetwork) {
      return false;
    }
    const currentTokenBalances = getTokenBalances();
    const newTokenBalances = tokenMetainfos
      .filter(
        (tokenMetainfo) =>
          currentTokenBalances.find((current) => current.tokenId === tokenMetainfo.tokenId) ===
          undefined,
      )
      .map((tokenMetainfo) => {
        return {
          ...tokenMetainfo,
          amount: {
            value: '0',
            denom: '',
          },
        };
      });

    const changedAccountTokenBalance: AccountTokenBalance = {
      accountId: currentAccount.id,
      chainId: currentNetwork.chainId,
      networkId: currentNetwork.networkId,
      tokenBalances: [...currentTokenBalances, ...newTokenBalances],
    };

    let changedAccountTokenBalances: AccountTokenBalance[] = [];

    if (
      accountTokenBalances.find((accountTokenBalance) =>
        matchCurrentAccount(currentAccount, accountTokenBalance),
      )
    ) {
      changedAccountTokenBalances = accountTokenBalances.map((accountTokenBalance) => {
        if (matchCurrentAccount(currentAccount, accountTokenBalance)) {
          return changedAccountTokenBalance;
        }
        return accountTokenBalance;
      });
    }
    changedAccountTokenBalances.push(changedAccountTokenBalance);
    setAccountTokenBalances(changedAccountTokenBalances);
    return true;
  }

  function getDisplayTokenBalances() {
    return getTokenBalances().filter((tokenBalance) => tokenBalance.display === true);
  }

  async function toggleDisplayOption(account: Account, token: TokenMetainfo, activated: boolean) {
    const changedAccountTokenBalances = accountTokenBalances.map((accountTokenBalance) => {
      if (matchCurrentAccount(account, accountTokenBalance)) {
        return {
          ...accountTokenBalance,
          tokenBalances: accountTokenBalance.tokenBalances.map((tokenBalance) => {
            if (tokenBalance.tokenId === token.tokenId) {
              return {
                ...tokenBalance,
                display: activated,
              };
            }
            return tokenBalance;
          }),
        };
      }
      return accountTokenBalance;
    });
    setAccountTokenBalances(changedAccountTokenBalances);
    await tokenService.updateAccountTokenMetainfos(changedAccountTokenBalances);
  }

  async function updateBalanceAmountByAccount(account: Account) {
    const tokenBalances = await Promise.all(
      getTokenBalances().map((tokenMetainfo) => fetchBalanceBy(account, tokenMetainfo)),
    );

    const changedAccountTokenBalances = accountTokenBalances.map((accountTokenBalance) => {
      if (matchCurrentAccount(account, accountTokenBalance)) {
        return {
          ...accountTokenBalance,
          tokenBalances,
        };
      }
      return accountTokenBalance;
    });
    setAccountTokenBalances(changedAccountTokenBalances);
    return true;
  }

  async function updateMainBalanceByAccount(account: Account) {
    const mainToken = tokenMetainfos.find((metainfo) => metainfo.main);
    if (!mainToken) {
      return false;
    }
    const mainTokeBalance = await fetchBalanceBy(account, mainToken);
    const changedAccountTokenBalances = accountTokenBalances.map((accountTokenBalance) => {
      if (matchCurrentAccount(account, accountTokenBalance)) {
        return {
          ...accountTokenBalance,
          tokenBalances: accountTokenBalance.tokenBalances.map((tokenBalance) => {
            if (tokenBalance.tokenId === mainTokeBalance.tokenId) {
              return mainTokeBalance;
            }
            return tokenBalance;
          }),
        };
      }
      return accountTokenBalance;
    });
    setAccountTokenBalances(changedAccountTokenBalances);
    return true;
  }

  async function fetchBalanceBy(account: Account, token: TokenMetainfo): Promise<TokenBalance> {
    const defaultAmount = {
      value: '0',
      denom: token.denom,
    };
    if (!gnoClient) {
      return {
        ...token,
        amount: defaultAmount,
      };
    }
    const prefix = currentNetwork?.addressPrefix ?? 'g';

    let balances: TokenBalance[] = [];
    if (token.type === 'NATIVE') {
      balances = await balanceService.getTokenBalances(gnoClient, account.getAddress(prefix));
    } else if (token.type === 'GRC20') {
      balances = await balanceService.getGRC20TokenBalance(
        gnoClient,
        account.getAddress(prefix),
        token.pkgPath,
        token.symbol,
      );
    }

    if (balances.length === 0 || !balances[0].amount) {
      return {
        ...token,
        amount: defaultAmount,
      };
    }

    return {
      ...token,
      amount: balances[0].amount,
    };
  }

  return {
    mainTokenBalance: getTokenBalances().find((tokenBalance) => tokenBalance.main)?.amount,
    tokenBalances: getTokenBalances(),
    displayTokenBalances: getDisplayTokenBalances(),
    accountTokenBalances: accountTokenBalances.filter(matchChainIdAndNetworkId),
    fetchBalanceBy,
    toggleDisplayOption,
    updateBalanceAmountByAccount,
    updateMainBalanceByAccount,
    updateTokenBalanceInfos,
  };
};
