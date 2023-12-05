import React from 'react';
import TokenBalance from '@components/common/token-balance/token-balance';
import theme from '@styles/theme';

export interface ManageTokenListItemBalanceProps {
  amount: {
    value: string;
    denom: string;
  }
}

const ManageTokenListItemBalance: React.FC<ManageTokenListItemBalanceProps> = ({ amount }) => {
  const {
    value,
    denom,
  } = amount;

  return (
    <TokenBalance
      value={value}
      denom={denom}
      orientation='HORIZONTAL'
      fontColor={theme.color.neutral[9]}
      fontStyleKey='body4Reg'
      minimumFontSize='10px'
    />
  );
};

export default ManageTokenListItemBalance;