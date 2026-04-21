import BigNumber from 'bignumber.js';

import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { TokenProfile } from 'adena-module';
import { TokenBalanceType } from '@types';

export class CosmosBalanceService {
  constructor(private cosmosLcdProvider: CosmosLcdProvider) {}

  async getTokenBalance(address: string, token: TokenProfile): Promise<TokenBalanceType | null> {
    const origin = token.origin;
    if (origin.kind !== 'cosmos-native' && origin.kind !== 'cosmos-ibc') {
      return null;
    }

    const denom = origin.kind === 'cosmos-native' ? origin.denom : origin.ibcDenom;
    const rawAmount = await this.cosmosLcdProvider.getBalance(address, denom);
    if (rawAmount === null) {
      return null;
    }

    const value = new BigNumber(rawAmount).shiftedBy(-token.decimals).toFixed();

    return {
      main: token.tags?.includes('staking') ?? false,
      tokenId: token.id,
      networkId: token.chainProfileId,
      display: true,
      type: 'cosmos-native',
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      image: token.iconUrl ?? '',
      amount: {
        value,
        denom: token.symbol,
      },
    };
  }

  async getTokenBalances(address: string, tokens: TokenProfile[]): Promise<TokenBalanceType[]> {
    const results = await Promise.all(
      tokens.map((token) => this.getTokenBalance(address, token)),
    );
    return results.filter((r): r is TokenBalanceType => r !== null);
  }
}
