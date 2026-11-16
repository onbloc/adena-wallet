import { FontsType } from '@styles/theme';
import BigNumber from 'bignumber.js';
import React, { useMemo } from 'react';
import { HighlightNumberWrapper } from './highlight-number.styles';

export interface HighlightNumberProps {
  value: string;
  fontColor?: string;
  fontStyleKey?: FontsType;
  minimumFontSize?: string;
  lineHeight?: string;
  withSign?: boolean;
}

export const HighlightNumber: React.FC<HighlightNumberProps> = ({
  value,
  fontColor = 'white',
  fontStyleKey = 'header6',
  minimumFontSize = '14px',
  lineHeight,
  withSign = false,
}) => {
  const hasDecimal = value.includes('.');
  const [integer, decimal] = hasDecimal ? value.split('.') : [value, ''];

  const integerStr = useMemo(() => {
    const parsed = BigNumber(integer.replace(/,/g, ''));
    // Pass non-numeric placeholders (e.g. '-' from an error state) through
    // unchanged. Without this, BigNumber('-').toFormat(0) returns "NaN" and
    // leaks into the row even though the upstream wallet-main mapping already
    // guarded with isFinite().
    const formattedValue = parsed.isFinite() ? parsed.toFormat(0) : integer;
    if (withSign) {
      return `+${formattedValue}`;
    }

    return formattedValue;
  }, [integer, withSign]);

  return (
    <HighlightNumberWrapper
      fontColor={fontColor}
      fontStyleKey={fontStyleKey}
      minimumFontSize={minimumFontSize}
      lineHeight={lineHeight}
    >
      <span className='value integer'>{integerStr}</span>
      <span className='value decimal'>
        {hasDecimal ? '.' : ''}
        {decimal}
      </span>
    </HighlightNumberWrapper>
  );
};
