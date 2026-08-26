import BigNumber from 'bignumber.js';

import { CosmosLcdProvider } from '@common/provider/cosmos/cosmos-lcd-provider';
import { TokenProfile } from 'adena-module';
import { TokenBalanceType } from '@types';

/**
 * On-chain denom a cosmos token is held as, or null for a token that does not
 * live on a cosmos chain (e.g. a gno-native profile).
 */
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
   * Balances for many tokens on one chain in a single LCD round-trip.
   *
   * Previously this issued one `balances/{address}/by_denom` request per token,
   * so the wallet's balance poll scaled with the number of registered cosmos
   * tokens. `getAllBalances` returns the whole bank balance in one request; a
   * denom the account holds nothing of is simply absent from the response and is
   * reported as zero, matching what `by_denom` used to return.
   *
   * A null response means the request itself failed. The empty result is what
   * callers use to flag the chain as unreachable, so it is deliberately not
   * conflated with "the account holds none of these tokens".
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
