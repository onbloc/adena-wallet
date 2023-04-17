import React from 'react';
import TokenBalance from '@components/common/token-balance/token-balance';

export interface MainTokenListItemBalanceProps {
  amount: {
    value: string;
    denom: string;
  }
}

const MainTokenListItemBalance: React.FC<MainTokenListItemBalanceProps> = ({ amount }) => {
  const {
    value,
    denom
  } = amount;

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

export default MainTokenListItemBalance;