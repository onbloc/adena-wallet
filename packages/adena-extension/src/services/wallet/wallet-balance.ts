import { GnoProvider } from '@common/provider/gno/gno-provider';
import { TokenModel, isGRC20TokenModel, isNativeTokenModel } from '@models/token-model';
import { BalanceState } from '@states/index';
import BigNumber from 'bignumber.js';

export class WalletBalanceService {
  private tokenMetainfos: TokenModel[];

  private gnoProvider: GnoProvider | null = null;

  constructor() {
    this.tokenMetainfos = [];
  }

  public getGnoProvider(): GnoProvider {
    if (!this.gnoProvider) {
      throw new Error('Gno provider not initialized.');
    }
    return this.gnoProvider;
  }

  public setGnoProvider(gnoProvider: GnoProvider): void {
    this.gnoProvider = gnoProvider;
  }

  public setTokenMetainfos(tokenMetainfos: Array<TokenModel>): void {
    this.tokenMetainfos = tokenMetainfos;
  }

  public getTokenBalances = async (address: string): Promise<BalanceState.TokenBalance[]> => {
    const gnoProvider = this.getGnoProvider();
    const denom = 'ugnot';
    const balance = await gnoProvider
      .getBalance(address, denom)
      .then((value) => ({
        value: value.toFixed(),
        denom,
      }))
      .catch(() => ({
        value: '0',
        denom,
      }));
    const tokenBalances: Array<BalanceState.TokenBalance> = [];

    for (const tokenMetainfo of this.tokenMetainfos) {
      const isNativeToken = isNativeTokenModel(tokenMetainfo);
      if (
        balance.denom.toUpperCase() === tokenMetainfo.symbol.toUpperCase() ||
        (isNativeToken && balance.denom.toUpperCase() === tokenMetainfo.denom.toUpperCase())
      ) {
        tokenBalances.push(this.createTokenBalance(balance, tokenMetainfo));
      }
    }
    return tokenBalances;
  };

  public getGRC20TokenBalance = async (
    address: string,
    packagePath: string,
    symbol: string,
  ): Promise<BalanceState.TokenBalance[]> => {
    const gnoProvider = this.getGnoProvider();
    const balance = await gnoProvider.getValueByEvaluateExpression(packagePath, 'BalanceOf', [
      address,
    ]);
    if (!balance) {
      return [];
    }
    const balanceAmount = {
      value: balance,
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
  ): {
    value: string;
    denom: string;
  } => {
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
