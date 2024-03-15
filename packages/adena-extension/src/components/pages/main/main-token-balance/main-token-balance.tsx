import React from 'react';
import { TokenBalance } from '@components/molecules';
import { MainTokenBalanceWrapper } from './main-token-balance.styles';

export interface MainTokenBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
}

const MainTokenBalance: React.FC<MainTokenBalanceProps> = ({ amount }) => {
  const { value, denom } = amount;

  return (
    <MainTokenBalanceWrapper>
      <TokenBalance
        value={value}
        denom={denom}
        orientation='VERTICAL'
        fontColor='white'
        fontStyleKey='header2'
        minimumFontSize='24px'
        lineHeight='39px'
      />
    </MainTokenBalanceWrapper>
  );
};

export default MainTokenBalance;
