import React from 'react';
import styled from 'styled-components';

interface CircleProps {
  width?: string;
  height?: string;
  bgColor?: string;
  margin?: string;
}

const CircleStyle = styled.div<CircleProps>`
  width: ${({ width }) => width && width};
  height: ${({ height }) => height && height};
  background-color: ${({ theme, bgColor }) => (bgColor ? bgColor : theme.color.neutral[4])};
  margin: ${({ margin }) => margin && margin};
  border-radius: 50%;
`;

export const Circle = ({ width, height, bgColor, margin }: CircleProps) => {
  return <CircleStyle width={width} height={height} bgColor={bgColor} margin={margin} />;
};
