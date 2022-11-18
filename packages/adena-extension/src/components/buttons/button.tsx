import styled, { css } from 'styled-components';
import React, { CSSProperties } from 'react';
import mixins from '@styles/mixins';

type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };
type XOR<T, U> = T | U extends Record<string, unknown>
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U;

export enum ButtonHierarchy {
  Primary = 'Primary',
  Ghost = 'Ghost',
  Dark = 'Dark',
  Danger = 'Danger',
}

export const modeVariants = {
  primary: css`
    background: ${({ theme }) => theme.color.primary[3]};
    &:hover {
      background: ${({ theme }) => theme.color.primary[4]};
    }
    &:disabled {
      background: ${({ theme }) => theme.color.primary[6]};
      color: ${({ theme }) => theme.color.neutral[4]};
    }
  `,
  ghost: css`
    background: ${({ theme }) => theme.color.neutral[8]};
    border: 1px solid ${({ theme }) => theme.color.neutral[2]};
    &:hover {
      background: ${({ theme }) => theme.color.neutral[5]};
      border: 1px solid ${({ theme }) => theme.color.neutral[2]};
    }
    &:disabled {
      background: ${({ theme }) => theme.color.neutral[6]};
      border: 1px solid ${({ theme }) => theme.color.neutral[3]};
      color: ${({ theme }) => theme.color.neutral[4]};
    }
  `,
  dark: css`
    background: ${({ theme }) => theme.color.neutral[4]};
    &:hover {
      background: ${({ theme }) => theme.color.neutral[5]};
    }
    &:disabled {
      background: ${({ theme }) => theme.color.neutral[5]};
      color: ${({ theme }) => theme.color.neutral[4]};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.color.red[2]};
  `,
};

type ButtonProps = XOR<
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

const Button = (props: ButtonProps) => {
  return <ButtonWrapper {...props}>{props.children}</ButtonWrapper>;
};

const ButtonWrapper = styled.button<ButtonProps>`
  ${mixins.flexbox('row', 'center', 'center')};
  width: ${({ width, fullWidth }) => {
    if (width) return typeof width === 'number' ? `${width}px` : width;
    if (fullWidth) return '100%';
    return 'auto';
  }};
  height: ${({ height }) => {
    if (height) return typeof height === 'number' ? height + 'px' : height;
    return 'auto';
  }};
  margin: ${(props) => props.margin};
  ${({ hierarchy }) => {
    if (hierarchy === ButtonHierarchy.Primary) return modeVariants.primary;
    if (hierarchy === ButtonHierarchy.Ghost) return modeVariants.ghost;
    if (hierarchy === ButtonHierarchy.Dark) return modeVariants.dark;
    if (hierarchy === ButtonHierarchy.Danger) return modeVariants.danger;
  }};
  border-radius: ${({ radius }) => (radius ? radius : '30px')};
  transition: all 0.4s ease;
  color: ${({ theme }) => theme.color.neutral[0]};
  background-color: ${({ bgColor }) => bgColor};
`;

Button.defaultProps = {
  disabled: false,
  hierarchy: 'primary',
  height: '48px',
};

export default Button;
