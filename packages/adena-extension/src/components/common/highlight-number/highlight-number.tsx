import React from 'react';
import { FontsType } from '@styles/theme';
import { HighlightNumberWrapper } from './highlight-number.styles';

export interface HighlightNumberProps {
  value: string;
  fontColor?: string;
  fontStyleKey?: FontsType;
  minimumFontSize?: string;
}

const HighlightNumber: React.FC<HighlightNumberProps> = ({
  value,
  fontColor = 'white',
  fontStyleKey = 'header6',
  minimumFontSize = '14px'
}) => {
  const hasDecimal = value.includes('.');
  const [integer, decimal] = hasDecimal ? value.split('.') : [value, ''];

  return (
    <HighlightNumberWrapper
      fontColor={fontColor}
      fontStyleKey={fontStyleKey}
      minimumFontSize={minimumFontSize}
    >
      <span className='value integer'>{integer}</span>
      <span className='value decimal'>{hasDecimal ? '.' : ''}{decimal}</span>
    </HighlightNumberWrapper>
  );
};

export default HighlightNumber;
