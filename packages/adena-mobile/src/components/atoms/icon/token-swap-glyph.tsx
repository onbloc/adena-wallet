import React, { ReactElement } from 'react';
import Svg, { Path } from 'react-native-svg';

export interface GlyphProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Two coins with circular arrows (the Swap entry); fill and stroke follow `color` like the lucide glyphs.
export const TokenSwapGlyph = ({ size = 24, color = 'currentColor', strokeWidth = 2 }: GlyphProps): ReactElement => (
  <Svg width={size} height={size} viewBox='0 0 24 24' fill='none'>
    <Path d='M8.94868 18.4936C10.7608 18.4936 12.2298 17.0246 12.2298 15.2125C12.2298 13.4004 10.7608 11.9313 8.94868 11.9313C7.13656 11.9313 5.66754 13.4004 5.66754 15.2125C5.66754 17.0246 7.13656 18.4936 8.94868 18.4936Z' fill={color} />
    <Path d='M14.9144 11.9312C16.7265 11.9312 18.1955 10.4621 18.1955 8.64998C18.1955 6.83785 16.7265 5.36884 14.9144 5.36884C13.1023 5.36884 11.6332 6.83785 11.6332 8.64998C11.6332 10.4621 13.1023 11.9312 14.9144 11.9312Z' fill={color} />
    <Path
      d='M4.2757 10.4397C4.81182 8.50224 6.05312 6.83535 7.7557 5.76654V8.25225M19.5877 13.4225C19.0516 15.36 17.8103 17.0269 16.1077 18.0957V15.6099'
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap='round'
      strokeLinejoin='round'
    />
  </Svg>
);
