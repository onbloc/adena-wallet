import {
  TokenBalance,
} from '@components/molecules'
import {
  useWindowSize,
} from '@hooks/use-window-size'
import React from 'react'

import {
  MainTokenBalanceWrapper,
} from './main-token-balance.styles'

export interface MainTokenBalanceProps {
  amount: {
    value: string
    denom: string
  }
}

const MainTokenBalance: React.FC<MainTokenBalanceProps> = ({
  amount,
}) => {
  const {
    value, denom,
  } = amount
  const {
    windowSizeType,
  } = useWindowSize()

  const orientation = windowSizeType === 'EXPAND' ? 'HORIZONTAL' : 'VERTICAL'

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
  )
}

export default MainTokenBalance
