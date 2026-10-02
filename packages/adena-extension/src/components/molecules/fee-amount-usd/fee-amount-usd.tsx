import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { formatUSD, formatUSDChange, makeTokenValue } from '@common/utils/price-utils';
import { fonts, getTheme } from '@styles/theme';
import { TokenPrice } from '@types';

export interface FeeAmountUSDProps {
  /** The fee in display units, exactly as rendered beside it. */
  value: string;
  /** Quote for the token the fee is charged in; see `useFeeTokenPrice`. */
  price: TokenPrice | undefined;
  /** Mirrors the amount's sign, for a storage deposit being released. */
  withSign?: boolean;
}

const FeeAmountUSDText = styled.span`
  ${fonts.captionReg};
  line-height: 15px;
  color: ${getTheme('neutral', 'a')};
  white-space: nowrap;
`;

/**
 * The USD line under a fee amount.
 *
 * Renders nothing when the fee token has no quote or the fee is zero, so an
 * unpriced network keeps the single-line row it has today rather than gaining
 * a placeholder.
 */
const FeeAmountUSD: React.FC<FeeAmountUSDProps> = ({ value, price, withSign = false }) => {
  const usdValue = useMemo(() => {
    const amount = BigNumber(value.replace(/,/g, ''));
    if (!amount.isFinite() || amount.isZero()) {
      return null;
    }

    const tokenValue = makeTokenValue(value, price);
    if (!tokenValue || !Number.isFinite(tokenValue.usdValue)) {
      return null;
    }

    return tokenValue.usdValue;
  }, [value, price]);

  if (usdValue === null) {
    return null;
  }

  return (
    <FeeAmountUSDText>
      {withSign ? formatUSDChange(usdValue) : formatUSD(usdValue)}
    </FeeAmountUSDText>
  );
};

export default FeeAmountUSD;
