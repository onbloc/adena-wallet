import BigNumber from 'bignumber.js';

import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { TokenProfile } from 'adena-module';
import { TokenBalanceType } from '@types';

/** On-chain denom, or null for a token that does not live on a cosmos chain. */
function cosmosDenomOf(token: TokenProfile): string | null {
  const origin = token.origin;
  if (origin.kind === 'cosmos-native') {
    return origin.denom;
  }
  if (origin.kind === 'cosmos-ibc') {
    return origin.ibcDenom;
  }
  return null;
}

export class CosmosBalanceService {
  constructor(private cosmosProvider: CosmosLcdProvider | null) {}

  async getTokenBalance(address: string, token: TokenProfile): Promise<TokenBalanceType | null> {
    if (!this.cosmosProvider) {
      return null;
    }

    const denom = cosmosDenomOf(token);
    if (denom === null) {
      return null;
    }

    const rawAmount = await this.cosmosProvider.getBalance(address, denom);
    if (rawAmount === null) {
      return null;
    }

    return this.toTokenBalance(token, denom, rawAmount);
  }

  /**
   * Balances for many tokens on one chain in a single LCD round-trip. A denom the
   * account holds nothing of is absent from the response and reported as zero,
   * matching what a per-denom query returns.
   *
   * A failed request yields an empty array, which callers read as "chain
   * unreachable" — deliberately distinct from a zero balance.
   */
  async getTokenBalances(address: string, tokens: TokenProfile[]): Promise<TokenBalanceType[]> {
    if (!this.cosmosProvider) {
      return [];
    }

    const cosmosTokens = tokens
      .map((token) => ({ token, denom: cosmosDenomOf(token) }))
      .filter((entry): entry is { token: TokenProfile; denom: string } => entry.denom !== null);

    if (cosmosTokens.length === 0) {
      return [];
    }

    const balances = await this.cosmosProvider.getAllBalances(address);
    if (balances === null) {
      return [];
    }

    const amountByDenom = new Map(balances.map((balance) => [balance.denom, balance.amount]));

    return cosmosTokens.map(({ token, denom }) =>
      this.toTokenBalance(token, denom, amountByDenom.get(denom) ?? '0'),
    );
  }

  private toTokenBalance(token: TokenProfile, denom: string, rawAmount: string): TokenBalanceType {
    const value = new BigNumber(rawAmount).shiftedBy(-token.decimals).toFixed();

    return {
      main: false,
      tokenId: token.id,
      networkId: token.chainProfileId,
      display: true,
      type: 'cosmos-native',
      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      image: token.iconUrl ?? '',
      // Raw on-chain denom (e.g. uatone / uphoton) required by
      // createCosmosTransaction to build the MsgSend amount. The amount.denom
      // below is the display symbol (e.g. ATONE) and cannot be used on-chain.
      denom,
      amount: {
        value,
        denom: token.symbol,
      },
    };
  }
}
