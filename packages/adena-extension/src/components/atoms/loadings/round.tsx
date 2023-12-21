import React from 'react';
import styled, { CSSProp } from 'styled-components';

interface RoundProps {
  width?: string;
  height?: string;
  bgColor?: string;
  radius?: string;
  margin?: string;
  children?: React.ReactNode;
}

const RoundStyle = styled.div<RoundProps>`
  ${({ children, theme }): false | CSSProp =>
    !!children && theme.mixins.flex('row', 'center', 'center')};
  width: ${({ width }): string => (width ? width : '100%')};
  height: ${({ height }): string | undefined => height && height};
  background-color: ${({ theme, bgColor }): string => (bgColor ? bgColor : theme.color.neutral[4])};
  margin: ${({ margin }): string | undefined => margin && margin};
  border-radius: ${({ radius }): string | undefined => radius && radius};
`;

export const Round = ({
  width,
  height,
  bgColor,
  radius,
  margin,
  children,
}: RoundProps): JSX.Element => {
  return (
    <RoundStyle width={width} height={height} bgColor={bgColor} radius={radius} margin={margin}>
      {children}
    </RoundStyle>
  );
};
