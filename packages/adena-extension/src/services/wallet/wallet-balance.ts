import { optimizeNumber } from "@common/utils/client-utils";
import { WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import BigNumber from "bignumber.js";
import { GnoClient } from "gno-client";

interface BalanceInfo {
  unit: string;
  amount: string;
}

export const getTokenBalances = async (
  gnoClient: InstanceType<typeof GnoClient>,
  address: string,
  tokenConfigs: Array<WalletState.TokenConfig>
) => {
  const response = await gnoClient.getBalances(address);
  const balances: Array<BalanceInfo> = [...response.balances];
  const tokenBalances: Array<WalletState.Balance> = [];

  for (const config of tokenConfigs) {
    const tokenBalance = balances.find(balance => balance.unit.toUpperCase() === config.denom.toUpperCase() || balance.unit.toUpperCase() === config.minimalDenom.toUpperCase());
    if (tokenBalance) {
      tokenBalances.push(createTokenBalance(tokenBalance, config));
    }
  }
  return tokenBalances;
};


export const convertUnit = (amount: BigNumber, denom: string, config: WalletState.TokenConfig, convertType?: 'COMMON' | 'MINIMAL'): { amount: BigNumber, denom: string } => {
  const convertDenomType = convertType ?? 'COMMON';
  const denomType = config.denom.toUpperCase() === denom.toUpperCase() ? 'COMMON' : 'MINIMAL';
  const currentUnit = denomType === 'COMMON' ? config.unit : config.minimalUnit;
  const convertUnit = convertDenomType === 'COMMON' ? config.unit : config.minimalUnit;

  const currentAmouont = optimizeNumber(amount, BigNumber(currentUnit).dividedBy(convertUnit));
  const currentDenom = convertDenomType === 'COMMON' ? config.denom.toUpperCase() : config.minimalDenom;

  return {
    amount: currentAmouont,
    denom: currentDenom
  }
};

const createTokenBalance = (balance: BalanceInfo, config: TokenConfig): WalletState.Balance => {
  const amount = BigNumber(balance.amount);
  const result = convertUnit(amount, balance.unit, config, 'COMMON');
  return {
    ...config,
    amount: result.amount,
    amountDenom: result.denom
  };
};