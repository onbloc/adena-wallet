import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { formatFeeUSD, makeTokenValue } from '@common/utils/price-utils';
import { SkeletonBoxStyle } from '@components/atoms';
import { TokenBalance } from '@components/molecules';
import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
import mixins from '@styles/mixins';
import { fonts } from '@styles/theme';
import { TokenPrice } from '@types';

export interface FeeAmountProps {
  /** The fee in display units. */
  value: string;
  /** Symbol of the token the fee is charged in. */
  denom: string;
  /** Quote for that token, from `useFeeTokenPrice`. */
  quote?: FeeTokenQuote | null;
  /** Mirrors the amount's sign, for a storage deposit being released. */
  withSign?: boolean;
  fontColor?: string;
}

// Matches the skeletons the fee rows already show while an estimate loads.
const FeeAmountSkeleton = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-start' })};
  width: 55px;
  height: 14px;
  align-self: center;
`;

const FeeAmountUSDText = styled.span<{ $color: string }>`
  ${fonts.body2Reg};
  color: ${({ $color, theme }): string => ($color === 'white' ? theme.neutral._1 : $color)};
  white-space: nowrap;
`;

/**
 * Converts a fee to USD, or null when there is no honest figure to show — an
 * unquoted token, or an amount that is zero or unreadable.
 */
export const toFeeUSDValue = (
  value: string,
  price: TokenPrice | null | undefined,
): number | null => {
  const amount = BigNumber(value.replace(/,/g, ''));
  if (!amount.isFinite() || amount.isZero()) {
    return null;
  }

  const tokenValue = makeTokenValue(value, price ?? undefined);
  if (!tokenValue || !Number.isFinite(tokenValue.usdValue)) {
    return null;
  }

  return tokenValue.usdValue;
};

/**
 * What a fee costs, in the one unit worth reading.
 *
 * A quoted fee reads in USD alone: the GNOT figure behind it is six decimals
 * of a number nobody converts in their head, and showing both only asks the
 * reader to pick. Without a quote — every testnet, by design — the row falls
 * back to the token amount, which is then the only thing there is to say.
 *
 * While a quote is still on its way the row waits rather than falling back,
 * so a fee that is about to read in USD never shows its GNOT figure first and
 * then swaps.
 */
const FeeAmount: React.FC<FeeAmountProps> = ({
  value,
  denom,
  quote,
  withSign = false,
  fontColor = 'white',
}) => {
  const usdValue = useMemo(() => toFeeUSDValue(value, quote?.price), [value, quote?.price]);

  if (usdValue === null && quote?.isLoading) {
    return <FeeAmountSkeleton />;
  }

  if (usdValue !== null) {
    return (
      <FeeAmountUSDText $color={fontColor}>{formatFeeUSD(usdValue, withSign)}</FeeAmountUSDText>
    );
  }

  return (
    <TokenBalance
      value={value}
      denom={denom}
      fontColor={fontColor}
      fontStyleKey='body2Reg'
      minimumFontSize='11px'
      orientation='HORIZONTAL'
      withSign={withSign}
    />
  );
};

export default FeeAmount;
