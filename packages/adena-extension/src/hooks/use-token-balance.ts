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
  toggleDisplayOption: (account: Account, token: TokenMetainfo, activated: boolean) => void;
  updateBalanceByAccountAndToken: (account: Account, token: TokenMetainfo) => Promise<void>;
  updateMainBalanceByAccount: (account: Account) => Promise<void>;
} => {
  const [gnoClient] = useGnoClient();
  const { tokenMetainfos } = useTokenMetainfo();
  const { balanceService, tokenService } = useAdenaContext();
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

  function matchCurrentAccount(account: Account | null, accountTokenBalance: AccountTokenBalance) {
    if (!account) return false;
    return (
      accountTokenBalance.accountId === account.id && matchChainIdAndNetworkId(accountTokenBalance)
    );
  }

  function toggleDisplayOption(account: Account, token: TokenMetainfo, activated: boolean) {
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
    tokenService.updateAccountTokenMetainfos(changedAccountTokenBalances);
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

    const accountBalanceIndex = accountTokenBalances.findIndex(
      (accountTokenBalance) =>
        accountTokenBalance.accountId === account.id &&
        matchChainIdAndNetworkId(accountTokenBalance),
    );

    const initializedBalances = [...accountTokenBalances];
    if (accountBalanceIndex < 0) {
      initializedBalances.push({
        accountId: account.id,
        chainId: token.chainId,
        networkId: token.networkId,
        tokenBalances: tokenMetainfos.map((metainfo) => {
          return {
            ...metainfo,
            amount: {
              value: '0',
              denom: metainfo.denom,
            },
          };
        }),
      });
    }

    const targetTokenBalances =
      initializedBalances.find((accountTokenBalance) =>
        matchCurrentAccount(account, accountTokenBalance),
      )?.tokenBalances ?? [];

    const changedTokenBalances = await Promise.all(
      targetTokenBalances.map((tokenBalance) => fetchBalanceBy(account, tokenBalance)),
    );

    const changedAccountTokenBalances = initializedBalances.map((accountTokenBalance) => {
      if (matchCurrentAccount(account, accountTokenBalance)) {
        return {
          ...accountTokenBalance,
          tokenBalances: changedTokenBalances,
        };
      }
      return accountTokenBalance;
    });
    setAccountTokenBalances(changedAccountTokenBalances);
    tokenService.updateAccountTokenMetainfos(changedAccountTokenBalances);
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

    return {
      ...token,
      amount: balances[0].amount ?? defaultAmount,
    };
  }

  return {
    mainTokenBalance: accountTokenBalances
      .find((accountTokenBalance) => matchCurrentAccount(currentAccount, accountTokenBalance))
      ?.tokenBalances.find((tokenBalance) => tokenBalance.type === 'NATIVE')?.amount,
    tokenBalances:
      accountTokenBalances.find((accountTokenBalance) =>
        matchCurrentAccount(currentAccount, accountTokenBalance),
      )?.tokenBalances ?? [],
    accountTokenBalances: accountTokenBalances.filter(matchChainIdAndNetworkId),
    toggleDisplayOption,
    updateBalanceByAccountAndToken,
    updateMainBalanceByAccount,
  };
};
