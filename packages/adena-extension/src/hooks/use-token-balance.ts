import { BalanceState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useNetwork } from './use-network';
import { useCurrentAccount } from './use-current-account';
import { AccountTokenBalance, Amount, TokenBalance } from '@states/balance';
import { Account } from 'adena-module';
import { useGnoClient } from './use-gno-client';
import { useAdenaContext, useWalletContext } from './use-context';
import { useTokenMetainfo } from './use-token-metainfo';
import { useCallback, useEffect } from 'react';
import { TokenModel, isGRC20TokenModel, isNativeTokenModel } from '@models/token-model';

export const useTokenBalance = (): {
  mainTokenBalance: Amount | undefined;
  tokenBalances: TokenBalance[];
  displayTokenBalances: TokenBalance[];
  accountTokenBalances: AccountTokenBalance[];
  accountNativeBalances: { [key in string]: TokenBalance };
  getTokenBalancesByAccount: (account: Account) => TokenBalance[];
  fetchBalanceBy: (account: Account, token: TokenModel) => Promise<TokenBalance>;
  toggleDisplayOption: (account: Account, token: TokenModel, activated: boolean) => void;
  updateBalanceAmountByAccount: (
    account: Account,
    accountTokenBalance?: AccountTokenBalance[],
  ) => Promise<boolean>;
  updateAccountNativeBalances: () => Promise<boolean>;
  updateMainBalanceByAccount: (account: Account) => Promise<boolean>;
  updateTokenBalanceInfos: (tokenMetainfos: TokenModel[]) => Promise<boolean>;
} => {
  const [gnoClient] = useGnoClient();
  const { tokenMetainfos } = useTokenMetainfo();
  const { wallet } = useWalletContext();
  const { balanceService, tokenService } = useAdenaContext();
  const { currentNetwork } = useNetwork();
  const { currentAccount } = useCurrentAccount();
  const [accountTokenBalances, setAccountTokenBalances] = useRecoilState(
    BalanceState.accountTokenBalances,
  );
  const [accountNativeBalances, setAccountNativeBalances] = useRecoilState(
    BalanceState.accountNativeBalances,
  );

  useEffect(() => {
    balanceService.setTokenMetainfos(tokenMetainfos);
  }, [tokenMetainfos]);

  const getTokenBalancesByAccount = useCallback(
    (account: Account) => {
      return (
        accountTokenBalances.find((accountTokenBalance) =>
          matchCurrentAccount(account, accountTokenBalance),
        )?.tokenBalances ?? []
      );
    },
    [accountTokenBalances],
  );

  const getCurrentTokenBalances = useCallback(() => {
    return currentAccount ? getTokenBalancesByAccount(currentAccount) : [];
  }, [getTokenBalancesByAccount, currentAccount]);

  const getMainTokenBalance = useCallback(() => {
    return getCurrentTokenBalances().find((token) => token.main)?.amount;
  }, [getTokenBalancesByAccount, currentAccount]);

  const getDisplayTokenBalances = useCallback(() => {
    return getCurrentTokenBalances().filter((token) => token.display);
  }, [getTokenBalancesByAccount, currentAccount]);

  function matchNetworkId(accountTokenBalance: AccountTokenBalance) {
    return accountTokenBalance.networkId === currentNetwork?.networkId;
  }

  function matchCurrentAccount(account: Account | null, accountTokenBalance: AccountTokenBalance) {
    if (!account) return false;
    return accountTokenBalance.accountId === account.id && matchNetworkId(accountTokenBalance);
  }

  async function toggleDisplayOption(account: Account, token: TokenModel, activated: boolean) {
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

  async function updateTokenBalanceInfos(tokenMetainfos: TokenModel[]) {
    if (!currentAccount || !currentNetwork) {
      return false;
    }
    const newTokenBalances = tokenMetainfos
      .filter(
        (tokenMetainfo) =>
          getCurrentTokenBalances().find((current) => current.tokenId === tokenMetainfo.tokenId) ===
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
      tokenBalances: [...getCurrentTokenBalances(), ...newTokenBalances],
    };

    let changedAccountTokenBalances: AccountTokenBalance[] = [...accountTokenBalances];

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
    } else {
      changedAccountTokenBalances.push(changedAccountTokenBalance);
    }
    await updateBalanceAmountByAccount(currentAccount, changedAccountTokenBalances);
    return true;
  }

  async function updateBalanceAmountByAccount(
    account: Account,
    newAccountTokenBalances?: AccountTokenBalance[],
  ) {
    const tokenBalances =
      newAccountTokenBalances?.find(
        (accountTokenBalance) => accountTokenBalance.accountId === account.id,
      )?.tokenBalances || getCurrentTokenBalances();
    const fetchedTokenBalances = await Promise.all(
      tokenBalances.map((tokenMetainfo) => fetchBalanceBy(account, tokenMetainfo)),
    );

    const changedAccountTokenBalances = (newAccountTokenBalances ?? accountTokenBalances).map(
      (accountTokenBalance) => {
        if (matchCurrentAccount(account, accountTokenBalance)) {
          return {
            ...accountTokenBalance,
            tokenBalances: fetchedTokenBalances,
          };
        }
        return accountTokenBalance;
      },
    );
    setAccountTokenBalances(changedAccountTokenBalances);
    updateAccountNativeBalances();
    return true;
  }

  async function updateAccountNativeBalances() {
    const nativeTokenInfo = tokenMetainfos.find((info) => info.main);
    if (!nativeTokenInfo || !wallet) {
      return false;
    }

    let accountNativeBalances = {};
    for (const account of wallet.accounts) {
      const balance = await fetchBalanceBy(account, nativeTokenInfo);
      accountNativeBalances = {
        ...accountNativeBalances,
        [account.id]: balance,
      };
    }
    setAccountNativeBalances(accountNativeBalances);
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

  async function fetchBalanceBy(account: Account, token: TokenModel): Promise<TokenBalance> {
    const defaultAmount = {
      value: '0',
      denom: token.symbol,
    };
    if (!gnoClient) {
      return {
        ...token,
        amount: defaultAmount,
      };
    }
    const prefix = currentNetwork?.addressPrefix ?? 'g';

    let balances: TokenBalance[] = [];
    if (isNativeTokenModel(token)) {
      balances = await balanceService.getTokenBalances(gnoClient, account.getAddress(prefix));
    } else if (isGRC20TokenModel(token)) {
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

    const amount = {
      denom: balances[0].amount.denom,
      value:
        balances[0].amount.value === 'NaN' ? '0' : `${balances[0].amount.value}`.replace(',', ''),
    };

    return {
      ...token,
      amount,
    };
  }

  return {
    mainTokenBalance: getMainTokenBalance(),
    tokenBalances: getCurrentTokenBalances(),
    displayTokenBalances: getDisplayTokenBalances(),
    accountTokenBalances: accountTokenBalances.filter(matchNetworkId),
    accountNativeBalances,
    getTokenBalancesByAccount,
    fetchBalanceBy,
    toggleDisplayOption,
    updateBalanceAmountByAccount,
    updateMainBalanceByAccount,
    updateTokenBalanceInfos,
    updateAccountNativeBalances,
  };
};
