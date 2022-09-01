import React from 'react';
import styled from 'styled-components';

interface RoundProps {
  width?: string;
  height?: string;
  bgColor?: string;
  radius?: string;
  margin?: string;
  children?: React.ReactNode;
}

const RoundStyle = styled.div<RoundProps>`
  ${({ children, theme }) => children && theme.mixins.flexbox('row', 'center', 'center')};
  width: ${({ width }) => (width ? width : '100%')};
  height: ${({ height }) => height && height};
  background-color: ${({ theme, bgColor }) => (bgColor ? bgColor : theme.color.neutral[4])};
  margin: ${({ margin }) => margin && margin};
  border-radius: ${({ radius }) => radius && radius};
`;

const Round = ({ width, height, bgColor, radius, margin, children }: RoundProps) => {
  return (
    <RoundStyle width={width} height={height} bgColor={bgColor} radius={radius} margin={margin}>
      {children}
    </RoundStyle>
  );
};

export default Round;
