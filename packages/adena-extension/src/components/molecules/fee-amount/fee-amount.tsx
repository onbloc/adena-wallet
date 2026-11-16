import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import styled from 'styled-components';

import { formatFeeUSD, makeTokenValue } from '@common/utils/price-utils';
import { SkeletonBoxStyle } from '@components/atoms';
import { TokenBalance } from '@components/molecules';
import { FeeTokenQuote } from '@hooks/wallet/use-fee-token-price';
import mixins from '@styles/mixins';
import { fonts, getTheme } from '@styles/theme';
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
  /** Lets a tighter row adjust the layout, e.g. wrap the USD value. */
  className?: string;
}

// Matches the skeletons the fee rows already show while an estimate loads.
const FeeAmountSkeleton = styled(SkeletonBoxStyle)`
  ${mixins.flex({ align: 'flex-start' })};
  width: 55px;
  height: 14px;
  align-self: center;
`;

// Size of the amount's decimal part, which the USD value matches.
const DECIMAL_FONT_SIZE = '11px';
const USD_TEXT_FONT_SIZE = '12px';

// Top-aligned like `TokenBalance`, so the USD value sits where the decimal part does.
const FeeAmountWrapper = styled.div`
  ${mixins.flex({ direction: 'row', align: 'flex-start' })};
  column-gap: 4px;
`;

const FeeAmountUSDText = styled.span`
  ${fonts.body2Reg};
  font-size: ${USD_TEXT_FONT_SIZE};
  height: 23px;
  line-height: 23px;
  color: ${getTheme('neutral', 'a')};
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
 * A fee as its token amount, followed by its USD value in parentheses when the
 * token is quoted: `0.043245 GNOT (<$0.001)`.
 *
 * While a quote is still on its way the row waits, so the USD value never
 * pops in beside an amount that is already on screen.
 */
const FeeAmount: React.FC<FeeAmountProps> = ({
  value,
  denom,
  quote,
  withSign = false,
  fontColor = 'white',
  className,
}) => {
  const usdValue = useMemo(() => toFeeUSDValue(value, quote?.price), [value, quote?.price]);

  if (usdValue === null && quote?.isLoading) {
    return <FeeAmountSkeleton />;
  }

  return (
    <FeeAmountWrapper className={className}>
      <TokenBalance
        value={value}
        denom={denom}
        fontColor={fontColor}
        fontStyleKey='body2Reg'
        minimumFontSize={DECIMAL_FONT_SIZE}
        orientation='HORIZONTAL'
        withSign={withSign}
      />
      {usdValue !== null && (
        <FeeAmountUSDText className='fee-amount-usd'>{`(${formatFeeUSD(usdValue, withSign)})`}</FeeAmountUSDText>
      )}
    </FeeAmountWrapper>
  );
};

export default FeeAmount;
