import { useCallback, useEffect, useMemo } from 'react';
import { useRecoilState } from 'recoil';
import { GnoWallet } from '@gnolang/gno-js-client';
import { Account, isSeedAccount, isSingleAccount } from 'adena-module';

import { useNetwork } from './use-network';
import { useCurrentAccount } from './use-current-account';
import { useAdenaContext, useWalletContext } from './use-context';
import { useTokenMetainfo } from './use-token-metainfo';
import { isGRC20TokenModel, isNativeTokenModel } from '@common/validation/validation-token';
import { BalanceState } from '@states';
import { NetworkMetainfo } from '@types';

import { TokenModel, AccountTokenBalance, Amount, TokenBalanceType } from '@types';

export const useTokenBalance = (): {
  mainTokenBalance: Amount | undefined;
  tokenBalances: TokenBalanceType[];
  displayTokenBalances: TokenBalanceType[];
  accountTokenBalances: AccountTokenBalance[];
  accountNativeBalances: { [key in string]: TokenBalanceType };
  getTokenBalancesByAccount: (account: Account) => TokenBalanceType[];
  fetchBalanceBy: (account: Account, token: TokenModel) => Promise<TokenBalanceType>;
  toggleDisplayOption: (account: Account, token: TokenModel, activated: boolean) => void;
  updateBalanceAmountByAccount: (
    account: Account,
    accountTokenBalance?: AccountTokenBalance[],
  ) => Promise<boolean>;
  updateAccountNativeBalances: () => Promise<boolean>;
  updateMainBalanceByAccount: (account: Account) => Promise<boolean>;
  updateTokenBalanceInfos: (tokenMetainfos: TokenModel[]) => Promise<boolean>;
} => {
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
  }, [tokenMetainfos, balanceService]);

  const filteredAccountBalances = useMemo(() => {
    return accountTokenBalances.filter((accountTokenBalance) =>
      matchNetworkId(accountTokenBalance, currentNetwork),
    );
  }, [accountTokenBalances, currentNetwork]);

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

  const currentTokenBalances = useMemo(() => {
    return currentAccount ? getTokenBalancesByAccount(currentAccount) : [];
  }, [getTokenBalancesByAccount, currentAccount]);

  const getMainTokenBalance = useCallback(() => {
    return currentTokenBalances.find((token) => token.main)?.amount;
  }, [getTokenBalancesByAccount, currentAccount]);

  const getDisplayTokenBalances = useCallback(() => {
    return currentTokenBalances.filter((token) => token.display);
  }, [getTokenBalancesByAccount, currentAccount]);

  function matchNetworkId(
    accountTokenBalance: AccountTokenBalance,
    currentNetwork: NetworkMetainfo,
  ): boolean {
    return accountTokenBalance.networkId === currentNetwork?.id;
  }

  function matchCurrentAccount(
    account: Account | null,
    accountTokenBalance: AccountTokenBalance,
  ): boolean {
    if (!account || !matchNetworkId) return false;
    return (
      accountTokenBalance.accountId === account.id &&
      matchNetworkId(accountTokenBalance, currentNetwork)
    );
  }

  async function toggleDisplayOption(
    account: Account,
    token: TokenModel,
    activated: boolean,
  ): Promise<void> {
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

  async function updateTokenBalanceInfos(tokenMetainfos: TokenModel[]): Promise<boolean> {
    if (!currentAccount || !currentNetwork) {
      return false;
    }
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
      networkId: currentNetwork.id,
      tokenBalances: [...currentTokenBalances, ...newTokenBalances],
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
  ): Promise<boolean> {
    const tokenBalances =
      newAccountTokenBalances?.find(
        (accountTokenBalance) =>
          accountTokenBalance.accountId === account.id &&
          accountTokenBalance.networkId === currentNetwork?.id,
      )?.tokenBalances || currentTokenBalances;
    const tokenBalancesOfNetwork = tokenBalances.filter(
      (tokenBalance) =>
        tokenBalance.networkId === 'DEFAULT' || tokenBalance.networkId === currentNetwork?.id,
    );
    const fetchedTokenBalances = await Promise.all(
      tokenBalancesOfNetwork.map((tokenMetainfo) => fetchBalanceBy(account, tokenMetainfo)),
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

  async function updateAccountNativeBalances(): Promise<boolean> {
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

  async function updateMainBalanceByAccount(account: Account): Promise<boolean> {
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

  async function fetchBalanceBy(account: Account, token: TokenModel): Promise<TokenBalanceType> {
    if (wallet === null) throw new Error('wallet doesn`t exist');

    const defaultAmount = {
      value: '0',
      denom: token.symbol,
    };
    const prefix = currentNetwork?.addressPrefix ?? 'g';

    let address = await account.getAddress(prefix);

    if (isSeedAccount(account)) {
      const keyring = wallet.keyrings.find((keyring) => keyring.id === account.keyringId);
      const mnemonic = keyring?.toData().mnemonic;
      if (mnemonic !== undefined) {
        const gnoWallet = await GnoWallet.fromMnemonic(mnemonic, {
          accountIndex: account.hdPath,
          addressPrefix: prefix,
        });
        address = await gnoWallet.getAddress();
      }
    } else if (isSingleAccount(account)) {
      const keyring = wallet.keyrings.find((keyring) => keyring.id === account.keyringId);
      const privateKey = keyring?.toData().privateKey;
      if (privateKey !== undefined) {
        const tm2Wallet = await GnoWallet.fromPrivateKey(new Uint8Array(privateKey), {
          addressPrefix: prefix,
        });
        address = await tm2Wallet.getAddress();
      }
    }

    let balances: TokenBalanceType[] = [];
    if (isNativeTokenModel(token)) {
      balances = await balanceService.getTokenBalances(address);
    } else if (isGRC20TokenModel(token)) {
      balances = await balanceService.getGRC20TokenBalance(address, token.pkgPath, token.symbol);
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
    tokenBalances: currentTokenBalances,
    displayTokenBalances: getDisplayTokenBalances(),
    accountTokenBalances: filteredAccountBalances,
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
