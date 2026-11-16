import { useMemo } from 'react';

import { FeeTokenQuote, useFeeTokenPrice } from '@hooks/wallet/use-fee-token-price';
import { TokenModel } from '@types';

/**
 * USD quote for the token being sent, keyed like the wallet main's rows so the
 * two share one query. No token, no quote.
 */
export const useTransferTokenPrice = (token: TokenModel | null | undefined): FeeTokenQuote => {
  const request = useMemo(
    () =>
      token
        ? { tokenId: token.tokenId, networkId: token.networkId, decimals: token.decimals }
        : null,
    [token?.tokenId, token?.networkId, token?.decimals],
  );

  // With an explicit request the denom is never consulted; an empty one keeps a
  // missing token from falling back to GNOT's price.
  return useFeeTokenPrice('', request);
};
