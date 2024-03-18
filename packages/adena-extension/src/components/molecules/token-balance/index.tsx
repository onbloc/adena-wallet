import React from 'react';
import { TokenBalanceWrapper } from './token-balance.styles';
import { FontsType } from '@styles/theme';
import { HighlightNumber } from '@components/atoms';

export interface TokenBalanceProps {
  value: string;
  denom: string;
  orientation?: 'VERTICAL' | 'HORIZONTAL';
  fontColor?: string;
  fontStyleKey?: FontsType;
  minimumFontSize?: string;
  lineHeight?: string;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  value,
  denom,
  orientation = 'VERTICAL',
  fontColor = 'white',
  fontStyleKey = 'header6',
  minimumFontSize = '14px',
  lineHeight,
}) => {
  return (
    <TokenBalanceWrapper
      orientation={orientation}
      fontColor={fontColor}
      fontStyleKey={fontStyleKey}
      minimumFontSize={minimumFontSize}
      lineHeight={lineHeight}
    >
      <HighlightNumber
        value={value}
        fontColor={fontColor}
        fontStyleKey={fontStyleKey}
        minimumFontSize={minimumFontSize}
        lineHeight={lineHeight}
      />
      <div className='denom-wrapper'>
        <span className='denom'>{denom}</span>
      </div>
    </TokenBalanceWrapper>
  );
};
