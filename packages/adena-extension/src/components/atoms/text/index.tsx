import styled, { CSSProp, css } from 'styled-components';
import React, { CSSProperties, PropsWithChildren } from 'react';
import { FontsType, fonts } from '@styles/theme';

interface TextProps extends React.ComponentPropsWithoutRef<'div'> {
  className?: string;
  type: FontsType;
  display?: CSSProperties['display'];
  textAlign?: CSSProperties['textAlign'];
  color?: string;
  margin?: CSSProperties['margin'];
}

export const Text = ({
  type,
  children,
  display = 'block',
  textAlign = 'left',
  color,
  margin,
  className = '',
  ...restProps
}: PropsWithChildren<TextProps>): JSX.Element => {
  return (
    <Wrapper
      type={type}
      display={display}
      textAlign={textAlign}
      color={color}
      margin={margin}
      className={className}
      {...restProps}
    >
      {children}
    </Wrapper>
  );
};

const Wrapper = styled.div<TextProps>`
  ${(props): CSSProp => {
    return css`
      ${fonts[props.type]};
      text-align: ${props.textAlign};
      display: ${props.display};
      color: ${props.color};
      white-space: pre-wrap;
      margin: ${props.margin};
    `;
  }}
`;
