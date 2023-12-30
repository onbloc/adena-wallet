import styled, { css } from 'styled-components';
import React, { CSSProperties } from 'react';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends Record<string, unknown>
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

type ButtonHierarchy = 'normal' | 'primary' | 'ghost' | 'dark' | 'danger' | 'custom';

export const modeVariants = {
  normal: css`
    background: ${getTheme('neutral', '_7')};
    &:hover {
      background: ${getTheme('neutral', 'b')};
    }
    /* &:disabled {
      background: ${getTheme('primary', '_9')};
      color: ${getTheme('neutral', '_5')};
    } */
  `,
  primary: css`
    background: ${getTheme('primary', '_6')};
    &:hover {
      background: ${getTheme('primary', '_7')};
    }
    &:disabled {
      background: ${getTheme('primary', '_9')};
      color: ${getTheme('neutral', '_5')};
    }
  `,
  ghost: css`
    background: ${getTheme('neutral', '_9')};
    border: 1px solid ${getTheme('neutral', '_3')};
    &:hover {
      background: ${getTheme('neutral', '_6')};
      border: 1px solid ${getTheme('neutral', '_3')};
    }
    &:disabled {
      background: ${getTheme('neutral', '_7')};
      border: 1px solid ${getTheme('neutral', '_4')};
      color: ${getTheme('neutral', '_5')};
    }
  `,
  dark: css`
    background: ${getTheme('neutral', '_5')};
    &:hover {
      background: ${getTheme('neutral', '_6')};
    }
    &:disabled {
      background: ${getTheme('neutral', '_6')};
      color: ${getTheme('neutral', '_5')};
    }
  `,
  danger: css`
    background: ${getTheme('red', '_5')};
    &:hover {
      background: #bb150b;
    }
    /* &:disabled {
      background: ${getTheme('neutral', '_6')};
      color: ${getTheme('neutral', '_5')};
    } */
  `,
};

export type ButtonProps = XOR<
  {
    fullWidth?: boolean;
    height?: CSSProperties['height'];
    hierarchy?: ButtonHierarchy;
    children: React.ReactNode;
    margin?: CSSProperties['margin'];
    radius?: string;
    className?: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
    tabIndex?: number;
    bgColor?: string;
  },
  {
    width?: CSSProperties['width'];
    height?: CSSProperties['height'];
    hierarchy?: ButtonHierarchy;
    children: React.ReactNode;
    margin?: CSSProperties['margin'];
    radius?: string;
    className?: string;
    disabled?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
    tabIndex?: number;
    bgColor?: string;
  }
>;

export const Button = (props: ButtonProps): JSX.Element => {
  return <ButtonWrapper {...props}>{props.children}</ButtonWrapper>;
};

const ButtonWrapper = styled.button<ButtonProps>`
  ${mixins.flex({ direction: 'row' })};
  width: ${({ width, fullWidth }): string => {
    if (width) return typeof width === 'number' ? `${width}px` : width;
    if (fullWidth) return '100%';
    return 'auto';
  }};
  height: ${({ height }): string => {
    if (height) return typeof height === 'number' ? height + 'px' : height;
    return 'auto';
  }};
  margin: ${(props): any => props.margin};
  ${({ hierarchy, bgColor }): any => {
    if (hierarchy === 'primary') return modeVariants.primary;
    if (hierarchy === 'normal') return modeVariants.normal;
    if (hierarchy === 'ghost') return modeVariants.ghost;
    if (hierarchy === 'dark') return modeVariants.dark;
    if (hierarchy === 'danger') return modeVariants.danger;
    if (hierarchy === 'custom')
      return css`
        background-color: ${bgColor};
      `;
  }};
  border-radius: ${({ radius }): string => (radius ? radius : '30px')};
  transition: all 0.4s ease;
  color: ${getTheme('neutral', '_1')};
  background-color: ${({ bgColor }): string | undefined => bgColor};
`;

Button.defaultProps = {
  disabled: false,
  hierarchy: 'primary',
  height: '48px',
};
