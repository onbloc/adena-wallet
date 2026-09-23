import React from 'react';
import styled from 'styled-components';

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

const TokenListItemBalance: React.FC<TokenListItemBalanceProps> = ({
  amount,
  usdDisplay = false,
  tokenValue = null,
  loading = false,
  error = false,
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

  if (usdDisplay) {
    return (
      <ValuedBalance>
        <span className='usd-value'>{tokenValue ? formatUSD(tokenValue.usdValue) : '-'}</span>
        <span className='token-amount'>{`${value} ${denom}`}</span>
      </ValuedBalance>
    );
  }

  return (
    <TokenBalance
      value={value}
      denom={denom}
      orientation='HORIZONTAL'
      fontColor='white'
      fontStyleKey='body2Reg'
      minimumFontSize='11px'
    />
  );
};

export default TokenListItemBalance;
