import { optimizeNumber } from "@common/utils/client-utils";
import { WalletState } from "@states/index";
import { TokenConfig } from "@states/wallet";
import BigNumber from "bignumber.js";
import { ChainService } from "..";

interface BalanceInfo {
  unit: string;
  amount: string;
}

export class WalletBalanceService {

  private chainService: ChainService;

  private tokenConfigs: Array<TokenConfig>;

  constructor(chainService: ChainService, tokenConfigs: Array<TokenConfig>) {
    this.chainService = chainService;
    this.tokenConfigs = tokenConfigs;
  }

  public getTokenBalances = async (
    address: string,
  ) => {
    const gnoClient = await this.chainService.getCurrentClient();
    const response = await gnoClient.getBalances(address);
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
