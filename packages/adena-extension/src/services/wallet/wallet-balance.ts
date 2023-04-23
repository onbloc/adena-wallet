import { BalanceState, TokenState } from '@states/index';
import { TokenMetainfo } from '@states/token';
import BigNumber from 'bignumber.js';
import { GnoClient } from 'gno-client';

export class WalletBalanceService {
  private tokenMetainfos: TokenMetainfo[];

  constructor() {
    this.tokenMetainfos = [];
  }

  public setTokenMetainfos(tokenMetainfos: Array<TokenMetainfo>) {
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
      const tokenBalance = balances.find(
        (balance) =>
          balance.denom.toUpperCase() === tokenMetainfo.denom.toUpperCase() ||
          balance.denom.toUpperCase() === tokenMetainfo.minimalDenom.toUpperCase(),
      );
      if (tokenBalance) {
        tokenBalances.push(this.createTokenBalance(tokenBalance, tokenMetainfo));
      }
    }
    return tokenBalances;
  };

  public convertDenom = (
    value: string,
    denom: string,
    tokenMetainfo: TokenState.TokenMetainfo,
    convertType: 'COMMON' | 'MINIMAL' = 'COMMON',
  ) => {
    const decimals = tokenMetainfo.decimals;
    let shift = 1;
    let convertedDenom = tokenMetainfo.denom;
    if (convertType === 'COMMON') {
      if (tokenMetainfo.denom.toUpperCase() !== denom.toUpperCase()) {
        shift = decimals * -1;
      }
    }

    if (convertType === 'MINIMAL') {
      convertedDenom = tokenMetainfo.minimalDenom;
      if (tokenMetainfo.minimalDenom.toUpperCase() !== denom.toUpperCase()) {
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
    tokenMetainfo: TokenMetainfo,
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
