import React from 'react';
import { TokenBalance } from '@components/molecules';

export interface MainTokenBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
}

const MainTokenBalance: React.FC<MainTokenBalanceProps> = ({ amount }) => {
  const { value, denom } = amount;

  return (
    <TokenBalance
      value={value}
      denom={denom}
      orientation='VERTICAL'
      fontColor='white'
      fontStyleKey='header2'
      minimumFontSize='24px'
    />
  );
};

export default MainTokenBalance;
