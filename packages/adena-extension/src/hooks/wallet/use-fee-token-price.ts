import { useMemo } from 'react';

import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { getTokenPriceKey } from '@common/utils/price-utils';
import { useNetwork } from '@hooks/use-network';
import { useTokenPrices } from '@hooks/use-token-prices';
import { TokenPrice, TokenPriceRequest } from '@types';

export interface FeeTokenQuote {
  /** The quote, once there is one. */
  price?: TokenPrice;
  /**
   * True while a quote is still on its way, so the row can wait instead of
   * shifting when the USD value lands. False once the request has failed.
   */
  isLoading: boolean;
}

const NO_REQUESTS: TokenPriceRequest[] = [];

/**
 * USD quote for the token a transaction's fee is charged in, with no price
 * when there is none — which is every testnet, by design.
 *
 * `denom` is the symbol the row is about to render. Only the current Gno
 * network's gas token is recognised on its own; a fee charged in anything else
 * has to name its token, or it goes unpriced rather than being valued at
 * GNOT's price.
 */
export const useFeeTokenPrice = (
  denom: string,
  feeToken?: TokenPriceRequest | null,
): FeeTokenQuote => {
  const { currentNetwork } = useNetwork();

  const target = useMemo<TokenPriceRequest | null>(() => {
    if (feeToken) {
      return feeToken;
    }

    if (denom !== GasToken.symbol) {
      return null;
    }

    return {
      tokenId: GNOT_TOKEN.denom,
      networkId: currentNetwork.networkId,
      decimals: GNOT_TOKEN.decimals,
    };
  }, [feeToken, denom, currentNetwork.networkId]);

  // `useTokenPrices` keys on the identities inside the array, not its
  // reference, so a caller passing a fresh `feeToken` object each render still
  // shares one query.
  const requests = useMemo(() => (target ? [target] : NO_REQUESTS), [target]);
  const { tokenPrices, isFetched, isError } = useTokenPrices(requests);

  return useMemo(() => {
    // A token nothing can quote has nothing to wait for, so the amount shows
    // straight away rather than sitting behind a skeleton that never resolves.
    if (!target) {
      return { price: undefined, isLoading: false };
    }

    return {
      price: tokenPrices[getTokenPriceKey(target.tokenId, target.networkId)],
      // A failed quote must not hide a fee that is already estimated.
      isLoading: !isFetched && !isError,
    };
  }, [target, tokenPrices, isFetched, isError]);
};
