import { TokenModel, isGRC20TokenModel, isNativeTokenModel } from '@models/token-model';
import { BalanceState, TokenState } from '@states/index';
import BigNumber from 'bignumber.js';
import { GnoClient } from 'gno-client';

export class WalletBalanceService {
  private tokenMetainfos: TokenModel[];

  constructor() {
    this.tokenMetainfos = [];
  }

  public setTokenMetainfos(tokenMetainfos: Array<TokenModel>) {
    this.tokenMetainfos = tokenMetainfos;
  }

  public getTokenBalances = async (gnoClient: GnoClient, address: string) => {
    const response = await gnoClient.getBalances(address);
    const balances = response.balances.map((balance) => {
      return {
        value: balance.amount,
        denom: balance.unit,
      };
    });
    const tokenBalances: Array<BalanceState.TokenBalance> = [];

    for (const tokenMetainfo of this.tokenMetainfos) {
      const isNativeToken = isNativeTokenModel(tokenMetainfo);
      const tokenBalance = balances.find(
        (balance) =>
          balance.denom.toUpperCase() === tokenMetainfo.symbol.toUpperCase() ||
          (isNativeToken && balance.denom.toUpperCase() === tokenMetainfo.denom.toUpperCase()),
      );
      if (tokenBalance) {
        tokenBalances.push(this.createTokenBalance(tokenBalance, tokenMetainfo));
      }
    }
    return tokenBalances;
  };

  public getGRC20TokenBalance = async (
    gnoClient: GnoClient,
    address: string,
    packagePath: string,
    symbol: string,
  ) => {
    const response = await gnoClient.queryEval(packagePath, 'BalanceOf', [address]);
    const rawData = response?.ResponseBase.Data ?? '';
    const parseDatas = rawData.replace('(', '').replace(')', '').split(' ');
    const value = parseDatas[0] ?? '0';
    const balanceAmount = {
      value,
      denom: symbol.toUpperCase(),
    };
    const tokenBalance = this.tokenMetainfos.find(
      (tokenMetainfo) => isGRC20TokenModel(tokenMetainfo) && tokenMetainfo.pkgPath === packagePath,
    );
    if (tokenBalance) {
      return [this.createTokenBalance(balanceAmount, tokenBalance)];
    }
    return [];
  };

  public convertDenom = (
    value: string,
    denom: string,
    tokenMetainfo: TokenModel,
    convertType: 'COMMON' | 'MINIMAL' = 'COMMON',
  ) => {
    const decimals = tokenMetainfo.decimals;
    let shift = 0;
    let convertedDenom = tokenMetainfo.symbol;
    if (convertType === 'COMMON') {
      if (tokenMetainfo.symbol.toUpperCase() !== denom.toUpperCase()) {
        shift = decimals * -1;
      }
    }

    if (convertType === 'MINIMAL') {
      convertedDenom = isNativeTokenModel(tokenMetainfo)
        ? tokenMetainfo.denom
        : tokenMetainfo.symbol;
      if (convertedDenom.toUpperCase() !== denom.toUpperCase()) {
        shift = decimals;
      }
    }

    return {
      value: new BigNumber(value).shiftedBy(shift).toString(),
      denom: convertedDenom,
    };
  };

  private createTokenBalance = (
    balance: {
      value: string;
      denom: string;
    },
    tokenMetainfo: TokenModel,
  ): BalanceState.TokenBalance => {
    const { value, denom } = this.convertDenom(
      balance.value,
      balance.denom,
      tokenMetainfo,
      'COMMON',
    );
    return {
      ...tokenMetainfo,
      amount: {
        value,
        denom,
      },
    };
  };
}
