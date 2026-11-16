import React from 'react';
import styled from 'styled-components';

import IconLockOutline from '@assets/icon-lock-outline';
import { formatUSD } from '@common/utils/price-utils';
import { SkeletonBoxStyle, WarningTriangleIcon } from '@components/atoms';
import { TokenBalance } from '@components/molecules';
import { fonts, getTheme } from '@styles/theme';
import { TokenValue } from '@types';

export interface TokenListItemBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
  /**
   * Screen-wide USD display mode. When on, the row leads with the USD value
   * and demotes the balance to a secondary line — including rows this wallet
   * has no quote for, which read "-" rather than dropping to a second layout.
   */
  usdDisplay?: boolean;
  tokenValue?: TokenValue | null;
  loading?: boolean;
  error?: boolean;
  /** Marks the amount as partly vesting-locked with a padlock. */
  locked?: boolean;
  /**
   * Row affordance rendered at the end of the amount line (the vesting
   * chevron). It sits inside the balance cell so the USD line above can run to
   * the row's right edge and stay flush with the unexpandable rows.
   */
  trailing?: React.ReactNode;
}

const BalanceSkeleton = styled(SkeletonBoxStyle)`
  width: 80px;
  height: 17px;
  border-radius: 6px;
  padding: 0;
`;

const ErrorRow = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const ValuedBalance = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;

  .usd-value {
    ${fonts.body2Reg};
    line-height: 15px;
    color: ${getTheme('neutral', '_1')};
  }

  /* Secondary line: no integer/decimal highlight, one size throughout. */
  .token-amount {
    ${fonts.captionReg};
    line-height: 15px;
    color: ${getTheme('neutral', 'a')};
    white-space: nowrap;
  }
`;

// Carries the amount plus any trailing affordance. Keeping the affordance on
// this line — rather than beside the whole cell — lets the USD line above run
// to the row's right edge, so priced rows all end on the same vertical line.
const AmountLine = styled.span`
  display: inline-flex;
  align-items: center;
`;

// Keeps the padlock on the same baseline as the amount it qualifies. The icon
// draws in `currentColor`, so it picks up the muted amount colour here.
const LockedAmount = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${getTheme('neutral', 'a')};

  svg {
    display: block;
    flex-shrink: 0;
  }
`;

const TokenListItemBalance: React.FC<TokenListItemBalanceProps> = ({
  amount,
  usdDisplay = false,
  tokenValue = null,
  loading = false,
  error = false,
  locked = false,
  trailing = null,
}) => {
  if (error) {
    return (
      <ErrorRow title='Failed to load balance'>
        <WarningTriangleIcon size={14} ariaLabel='Failed to load balance' />
        <TokenBalance
          value='-'
          denom={amount.denom}
          orientation='HORIZONTAL'
          fontColor='white'
          fontStyleKey='body2Reg'
          minimumFontSize='11px'
        />
      </ErrorRow>
    );
  }

  if (loading) {
    return <BalanceSkeleton aria-label='Loading balance' />;
  }

  const { value, denom } = amount;

  const amountText = `${value} ${denom}`;

  if (usdDisplay) {
    return (
      <ValuedBalance>
        <span className='usd-value'>{tokenValue ? formatUSD(tokenValue.usdValue) : '-'}</span>
        <AmountLine>
          {locked ? (
            <LockedAmount>
              <IconLockOutline />
              <span className='token-amount'>{amountText}</span>
            </LockedAmount>
          ) : (
            <span className='token-amount'>{amountText}</span>
          )}
          {trailing}
        </AmountLine>
      </ValuedBalance>
    );
  }

  const balance = (
    <TokenBalance
      value={value}
      denom={denom}
      orientation='HORIZONTAL'
      fontColor='white'
      fontStyleKey='body2Reg'
      minimumFontSize='11px'
    />
  );

  // Unpriced rows keep their single line; the padlock simply precedes it.
  return (
    <AmountLine>
      {locked ? (
        <LockedAmount>
          <IconLockOutline />
          {balance}
        </LockedAmount>
      ) : (
        balance
      )}
      {trailing}
    </AmountLine>
  );
};

export default TokenListItemBalance;
