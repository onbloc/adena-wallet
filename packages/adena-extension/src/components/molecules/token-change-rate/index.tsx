import React from 'react';

import { formatChangeRate, getChangeTone } from '@common/utils/price-utils';
import { TokenChangeRateWrapper } from './token-change-rate.styles';

export interface TokenChangeRateProps {
  /** 24h change in percent. `3.29` renders as `+3.29%`. */
  rate: number;
  /** `badge` sits beside the portfolio total; `plain` sits in a token row. */
  variant?: 'badge' | 'plain';
}

export const TokenChangeRate: React.FC<TokenChangeRateProps> = ({ rate, variant = 'plain' }) => {
  const tone = getChangeTone(rate);

  return (
    <TokenChangeRateWrapper $tone={tone} $variant={variant}>
      {formatChangeRate(rate)}
    </TokenChangeRateWrapper>
  );
};
