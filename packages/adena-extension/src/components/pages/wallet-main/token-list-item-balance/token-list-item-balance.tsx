import React from 'react';
import styled from 'styled-components';

import { SkeletonBoxStyle, WarningTriangleIcon } from '@components/atoms';
import { TokenBalance } from '@components/molecules';

export interface TokenListItemBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
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

const TokenListItemBalance: React.FC<TokenListItemBalanceProps> = ({
  amount,
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
