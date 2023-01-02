import { WalletState } from '@states/index';
import { useRecoilState } from 'recoil';
import { useGnoClient } from './use-gno-client';
import { useEffect } from 'react';
import { useTokenConfig } from './use-token-config';
import { TokenConfig, Balance } from '@states/wallet';
import BigNumber from 'bignumber.js';

interface BalanceInfo {
  unit: string;
  amount: string;
}

export const useWalletBalances = (
  initialize?: boolean,
): [balances: Array<Balance>, updateBalances: () => void] => {
  const [gnoClient, ,] = useGnoClient();
  const [currentAccount] = useRecoilState(WalletState.currentAccount);
  const [balances, setBalances] = useRecoilState(WalletState.balances);
  const [getTokenConfig, convertTokenUnit, getTokenImage] = useTokenConfig();

  useEffect(() => {
    if (initialize) {
      updateBalances();
    }
  }, [gnoClient, currentAccount?.getAddress()]);


  const updateBalances = async () => {
    if (currentAccount && gnoClient) {
      const tokenConfigs = await getTokenConfig();
      const response = await gnoClient.getBalances(currentAccount.getAddress());
      const balances: Array<BalanceInfo> = [...response.balances];
      const tokenBalances = balances.map(balance => createTokenBalance(balance, tokenConfigs))
        .filter(balance => balance !== null);

      if (tokenBalances.length > 0) {
        setBalances(tokenBalances as Array<Balance>);
      }
    }
  };

  const createTokenBalance = (balance: BalanceInfo, configs: Array<TokenConfig>): Balance | null => {
    const currentConfig = configs.find((config) =>
      config.denom.toUpperCase() === balance.unit.toUpperCase() ||
      config.minimalDenom.toUpperCase() === balance.unit.toUpperCase()
    );

    if (currentConfig) {
      const amount = BigNumber(balance.amount);
      const result = convertTokenUnit(amount, balance.unit, 'COMMON');
      return {
        minimalDenom: currentConfig.minimalDenom,
        denom: currentConfig.denom,
        image: getTokenImage(currentConfig.denom) ?? '',
        imageData: getTokenImage(currentConfig.denom) ?? '',
        name: currentConfig.name,
        type: currentConfig.type,
        minimalUnit: currentConfig.minimalUnit,
        unit: currentConfig.unit,
        amount: result.amount,
        amountDenom: result.denom
      };
    }

    return null;
  };

  return [balances, updateBalances];
};
