import React from 'react';
import { useTheme } from 'styled-components';

import { TokenBalance } from '@components/molecules';

export interface ManageTokenListItemBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
}

const ManageTokenListItemBalance: React.FC<ManageTokenListItemBalanceProps> = ({ amount }) => {
  const { value, denom } = amount;

  const theme = useTheme();

  return (
    <TokenBalance
      value={value}
      denom={denom}
      orientation='HORIZONTAL'
      fontColor={theme.neutral.a}
      fontStyleKey='body4Reg'
      minimumFontSize='10px'
    />
  );
};

export default ManageTokenListItemBalance;
