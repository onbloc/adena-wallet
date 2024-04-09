import React from 'react';
import { TokenBalance } from '@components/molecules';
import { MainTokenBalanceWrapper } from './main-token-balance.styles';
import { useWindowSize } from '@hooks/use-window-size';

export interface MainTokenBalanceProps {
  amount: {
    value: string;
    denom: string;
  };
}

const MainTokenBalance: React.FC<MainTokenBalanceProps> = ({ amount }) => {
  const { value, denom } = amount;
  const { windowSizeType } = useWindowSize();

  const orientation = windowSizeType === 'EXPAND' ? 'HORIZONTAL' : 'VERTICAL';

  return (
    <MainTokenBalanceWrapper>
      <TokenBalance
        value={value}
        denom={denom}
        orientation={orientation}
        fontColor='white'
        fontStyleKey='header2'
        minimumFontSize='24px'
        lineHeight='39px'
        maxWidth={200}
      />
    </MainTokenBalanceWrapper>
  );
};

export default MainTokenBalance;
