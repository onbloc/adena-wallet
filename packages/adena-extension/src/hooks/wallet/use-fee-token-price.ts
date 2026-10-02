import { useMemo } from 'react';

import { GasToken, GNOT_TOKEN } from '@common/constants/token.constant';
import { getTokenPriceKey } from '@common/utils/price-utils';
import { useNetwork } from '@hooks/use-network';
import { useTokenPrices } from '@hooks/use-token-prices';
import { TokenPrice, TokenPriceRequest } from '@types';

const NO_REQUESTS: TokenPriceRequest[] = [];

/**
 * USD quote for the token a transaction's fee is charged in, or undefined when
 * there is none — which is every testnet, by design.
 *
 * `denom` is the symbol the row is about to render. Only the current Gno
 * network's gas token is recognised on its own; a fee charged in anything else
 * has to name its token, or it goes unpriced rather than being valued at
 * GNOT's price.
 */
export const useFeeTokenPrice = (
  denom: string,
  feeToken?: TokenPriceRequest | null,
): TokenPrice | undefined => {
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
  const { tokenPrices } = useTokenPrices(requests);

  return useMemo(() => {
    if (!target) {
      return undefined;
    }

    return tokenPrices[getTokenPriceKey(target.tokenId, target.networkId)];
  }, [target, tokenPrices]);
};
