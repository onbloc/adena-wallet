import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useGnoClient } from './use-gno-client';
import axios from 'axios';
import { useEffect } from 'react';

interface BalanceInfo {
  unit: string;
  amount: string;
}

interface TokenInfo {
  denom?: string;
  img?: string;
  name?: string;
  type?: string;
  unit?: number;
  amount?: number;
}

export const useWalletBalances = (
  initialize?: boolean,
): [balances: Array<TokenInfo>, updateBalances: () => void] => {
  const [gnoClient, ,] = useGnoClient();
  const [currentAccount] = useRecoilState(WalletState.currentAccount);
  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [tokenInfos, setTokenInfos] = useRecoilState(WalletState.tokenInfos);

  useEffect(() => {
    if (initialize && tokenInfos.length > 0) {
      updateBalances();
    }
  }, [gnoClient, tokenInfos, currentAccount?.getAddress()]);

  useEffect(() => {
    if (tokenInfos.length === 0) {
      updateTokenInfos();
    }
  }, [tokenInfos])

  const updateTokenInfos = async () => {
    const response = await axios.get<Array<TokenInfo>>('https://conf.adena.app/token.json');
    setTokenInfos(response.data);
    return response.data;
  }

  const updateBalances = async () => {
    if (currentAccount && gnoClient) {
      let currentTokenInfo = [...tokenInfos];
      if (currentTokenInfo.length === 0) {
        currentTokenInfo = await updateTokenInfos();
      }
      const response = await gnoClient.getBalances(currentAccount.getAddress());
      const balances: Array<BalanceInfo> = [...response.balances];
      const tokenBalances = currentTokenInfo
        .filter((element) => balances.findIndex((balance) => balance.unit === element.denom) > -1)
        .map((element) => createTokenBalances(element, balances));

      if (tokenBalances.length > 0) {
        setBalances(tokenBalances);
      }
    }
  };

  const createTokenBalances = (element: TokenInfo, balances: Array<BalanceInfo>): TokenInfo => {
    const currentBalance = balances.find((balance) => balance.unit === element.denom);
    let amount = 0.0;
    if (currentBalance) {
      if (element.unit) {
        amount = parseFloat((parseFloat(currentBalance.amount) * element.unit).toFixed(6));
      } else {
        amount = parseFloat(currentBalance.amount);
      }
    }

    return {
      denom: element.denom ?? 'gnot',
      img: element.img ?? '../../../../assets/gnot-logo.svg',
      name: element.name ?? 'Gnoland',
      type: element.type ?? 'GNOT',
      unit: element.unit ?? 0,
      amount,
    };
  };

  return [balances, updateBalances];
};
