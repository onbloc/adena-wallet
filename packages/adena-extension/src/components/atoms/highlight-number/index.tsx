import React from 'react';
import { FontsType } from '@styles/theme';
import { HighlightNumberWrapper } from './highlight-number.styles';

export interface HighlightNumberProps {
  value: string;
  fontColor?: string;
  fontStyleKey?: FontsType;
  minimumFontSize?: string;
  lineHeight?: string;
}

export const HighlightNumber: React.FC<HighlightNumberProps> = ({
  value,
  fontColor = 'white',
  fontStyleKey = 'header6',
  minimumFontSize = '14px',
  lineHeight,
}) => {
  const hasDecimal = value.includes('.');
  const [integer, decimal] = hasDecimal ? value.split('.') : [value, ''];

  return (
    <HighlightNumberWrapper
      fontColor={fontColor}
      fontStyleKey={fontStyleKey}
      minimumFontSize={minimumFontSize}
      lineHeight={lineHeight}
    >
      <span className='value integer'>{integer}</span>
      <span className='value decimal'>
        {hasDecimal ? '.' : ''}
        {decimal}
      </span>
    </HighlightNumberWrapper>
  );
};
