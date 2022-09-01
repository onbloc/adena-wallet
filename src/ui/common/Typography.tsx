import React from 'react';
import styled, { css } from 'styled-components';

export const textVariants = {
  header1: css`
    font-weight: 700;
    font-size: 48px;
    line-height: 72px;
  `,
  header2: css`
    font-weight: 700;
    font-size: 32px;
    line-height: 48px;
  `,
  header3: css`
    font-weight: 700;
    font-size: 28px;
    line-height: 42px;
  `,
  header4: css`
    font-weight: 700;
    font-size: 24px;
    line-height: 34px;
  `,
  header5: css`
    font-weight: 700;
    font-size: 20px;
    line-height: 30px;
  `,
  header6: css`
    font-weight: 700;
    font-size: 18px;
    line-height: 27px;
  `,
  body1Bold: css`
    font-weight: 600;
    font-size: 16px;
    line-height: 24px;
  `,
  body1Reg: css`
    font-weight: 400;
    font-size: 16px;
    line-height: 24px;
  `,
  body2Bold: css`
    font-weight: 600;
    font-size: 14px;
    line-height: 21px;
  `,
  body2Reg: css`
    font-weight: 400;
    font-size: 14px;
    line-height: 21px;
  `,
  body3Bold: css`
    font-weight: 600;
    font-size: 12px;
    line-height: 21px;
  `,
  body3Reg: css`
    font-weight: 400;
    font-size: 12px;
    line-height: 21px;
  `,
  title1: css`
    font-weight: 500;
    font-size: 25px;
    line-height: 30px;
  `,
  captionBold: css`
    font-weight: 700;
    font-size: 11px;
    line-height: 18px;
  `,
  captionReg: css`
    font-weight: 400;
    font-size: 11px;
    line-height: 18px;
  `,
};

export type TextVariant = keyof typeof textVariants;

interface TypographyProps {
  className?: string;
  type: TextVariant;
  children: string;
  disabled?: boolean;
  color?: string;
}

const Text = styled.span<TypographyProps>`
  ${({ type }) => (type ? textVariants[type] : '')};
  color: ${({ disabled, theme, color }) => (disabled ? theme.color.neutral[4] : color)};
  white-space: pre-wrap;
`;

const Typography = ({ className, type, children, disabled, color }: TypographyProps) => (
  <Text className={className} type={type} disabled={disabled} color={color}>
    {children}
  </Text>
);

Typography.defaultProps = {
  disabled: false,
  color: '#ffffff',
};

export default Typography;
