import React from 'react';
import styled, { css } from 'styled-components';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  mode: 'primary' | 'ghost' | 'dark';
  disabled?: boolean;
  height: string;
  margin?: string;
  tabIndex?: number;
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
};

const ButtonStyle = styled.button<ButtonProps>`
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'center')};
  ${({ mode }) => (mode ? modeVariants[mode] : '')};
  margin: ${({ margin }) => margin && margin};
  height: ${(props) => props.height};
  width: 100%;
  border-radius: 30px;
  color: ${({ theme }) => theme.color.neutral[0]};
  transition: all 0.4s ease;
`;

const FullButton = ({
  children,
  mode,
  disabled,
  onClick,
  height,
  margin,
  tabIndex,
}: ButtonProps) => {
  return (
    <ButtonStyle
      mode={mode}
      disabled={disabled}
      onClick={onClick}
      height={height}
      margin={margin}
      tabIndex={tabIndex}
    >
      {children}
    </ButtonStyle>
  );
};

FullButton.defaultProps = {
  disabled: false,
  mode: 'primary',
  height: '48px',
};

export default FullButton;
