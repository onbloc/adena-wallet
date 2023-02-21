import { optimizeNumber } from "@common/utils/client-utils";
import { WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import BigNumber from "bignumber.js";
import { GnoClient } from "gno-client";

interface BalanceInfo {
  unit: string;
  amount: string;
}

export class WalletBalanceService {

  private gnoClient: InstanceType<typeof GnoClient> | null;

  private tokenConfigs: Array<TokenConfig>;

  constructor(gnoClient: InstanceType<typeof GnoClient> | null, tokenConfigs: Array<TokenConfig>) {
    this.gnoClient = gnoClient;
    this.tokenConfigs = tokenConfigs;
  }

  public getTokenBalances = async (
    address: string,
  ) => {
    if (!this.gnoClient) {
      return null;
    }
    const response = await this.gnoClient.getBalances(address);
    const balances: Array<BalanceInfo> = [...response.balances];
    const tokenBalances: Array<WalletState.Balance> = [];

    for (const config of this.tokenConfigs) {
      const tokenBalance = balances.find(balance => balance.unit.toUpperCase() === config.denom.toUpperCase() || balance.unit.toUpperCase() === config.minimalDenom.toUpperCase());
      if (tokenBalance) {
        tokenBalances.push(this.createTokenBalance(tokenBalance, config));
      }
    }
    return tokenBalances;
  };


  public convertUnit = (amount: BigNumber, denom: string, config: WalletState.TokenConfig, convertType?: 'COMMON' | 'MINIMAL'): { amount: BigNumber, denom: string } => {
    const convertDenomType = convertType ?? 'COMMON';
    const denomType = config.denom.toUpperCase() === denom.toUpperCase() ? 'COMMON' : 'MINIMAL';
    const currentUnit = denomType === 'COMMON' ? config.unit : config.minimalUnit;
    const convertUnit = convertDenomType === 'COMMON' ? config.unit : config.minimalUnit;

    const currentAmount = optimizeNumber(amount, BigNumber(currentUnit).dividedBy(convertUnit));
    const currentDenom = convertDenomType === 'COMMON' ? config.denom.toUpperCase() : config.minimalDenom;

    return {
      amount: currentAmount,
      denom: currentDenom
    }
  };

  private createTokenBalance = (balance: BalanceInfo, config: TokenConfig): WalletState.Balance => {
    const amount = BigNumber(balance.amount);
    const result = this.convertUnit(amount, balance.unit, config, 'COMMON');
    return {
      ...config,
      amount: result.amount,
      amountDenom: result.denom
    };
  };
}
