import { HighlightNumber } from '@components/atoms';
import { FontsType } from '@styles/theme';
import React from 'react';
import { TokenBalanceWrapper } from './token-balance.styles';

export interface TokenBalanceProps {
  value: string;
  denom: string;
  orientation?: 'VERTICAL' | 'HORIZONTAL';
  fontColor?: string;
  fontStyleKey?: FontsType;
  minimumFontSize?: string;
  lineHeight?: string;
  maxWidth?: number;
  withSign?: boolean;
}

export const TokenBalance: React.FC<TokenBalanceProps> = ({
  value,
  denom,
  orientation = 'VERTICAL',
  fontColor = 'white',
  fontStyleKey = 'header6',
  minimumFontSize = '14px',
  lineHeight,
  maxWidth,
  withSign = false,
}) => {
  return (
    <TokenBalanceWrapper
      orientation={orientation}
      fontColor={fontColor}
      fontStyleKey={fontStyleKey}
      minimumFontSize={minimumFontSize}
      lineHeight={lineHeight}
      maxWidth={maxWidth}
    >
      <HighlightNumber
        value={value}
        fontColor={fontColor}
        fontStyleKey={fontStyleKey}
        minimumFontSize={minimumFontSize}
        lineHeight={lineHeight}
        withSign={withSign}
      />
      <div className='denom-wrapper'>
        <span className='denom'>{denom}</span>
      </div>
    </TokenBalanceWrapper>
  );
};
