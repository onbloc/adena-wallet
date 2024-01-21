import React, { ReactElement } from 'react';
import styled, { FlattenSimpleInterpolation } from 'styled-components';

import { WebFontType, getTheme, webFonts } from '@styles/theme';

type FormTextProps = {
  type: WebFontType;
  children: string;
  color?: string;
  style?: React.CSSProperties;
  textCenter?: boolean;
};

const StyledContainer = styled.div<{ type: WebFontType }>`
  color: ${getTheme('webNeutral', '_100')};
  ${({ type }): FlattenSimpleInterpolation => webFonts[type]}
  white-space: pre-wrap;
`;

export const WebText = ({
  type,
  color,
  style,
  children,
  textCenter,
  ...rest
}: FormTextProps): ReactElement => {
  return (
    <StyledContainer
      type={type}
      style={{ color, textAlign: textCenter ? 'center' : 'initial', ...style }}
      {...rest}
    >
      {children}
    </StyledContainer>
  );
};
