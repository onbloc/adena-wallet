import styled, { css } from 'styled-components';
import React from 'react';
import Text from '@components/text';
import Icon from '@components/icons';
import { FontsType } from '@styles/theme';
import { modeVariants } from './button';

export type ButtonMode = 'DEFAULT' | 'DANGER' | 'HOVER';
export type IconMode = 'ARROW' | 'WEBLINK';

interface ButtonStyleProps {
  mode?: ButtonMode;
  gap?: string | number;
  icon?: IconMode;
}

interface ButtonProps extends ButtonStyleProps {
  title: string;
  textType?: FontsType;
  className?: string;
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => unknown;
}

const FullButtonRightIcon = ({
  title,
  textType = 'body1Bold',
  mode = 'DEFAULT',
  className,
  disabled,
  onClick,
  gap = 12,
  icon = 'ARROW',
}: ButtonProps) => {
  return (
    <ButtonWrapper
      disabled={disabled}
      className={className}
      onClick={onClick}
      mode={mode}
      gap={gap}
    >
      <Text type={textType} color='inherit'>
        {title}
      </Text>
      {icon === 'ARROW' && <Icon name='iconArrowV2' className='icon-arrow-v2' />}
      {icon === 'WEBLINK' && <Icon name='iconWebLink' />}
    </ButtonWrapper>
  );
};

const defaultIconStyle = css<ButtonStyleProps>`
  .icon-arrow-v2 * {
    stroke: ${({ theme, mode }) =>
      mode === 'DANGER' ? theme.color.red[7] : theme.color.neutral[4]};
  }
`;

const hoverIconStyle = css<ButtonStyleProps>`
  .icon-arrow-v2 * {
    stroke: ${({ theme, mode }) =>
      mode === 'DANGER' ? theme.color.red[2] : theme.color.neutral[0]};
  }
`;

const ButtonWrapper = styled.button<ButtonStyleProps>`
  & + & {
    margin-top: ${({ gap }) => (typeof gap === 'number' ? gap + 'px' : gap)};
  }
  ${defaultIconStyle};
  ${({ theme }) => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 54px;
  padding: 0px 24px 0px 20px;
  border-radius: 18px;
  transition: all 0.3s ease;
  background-color: ${({ theme }) => theme.color.neutral[6]};
  color: ${({ theme, mode }) => (mode === 'DANGER' ? theme.color.red[2] : theme.color.neutral[0])};
  &:not(:disabled):hover {
    background-color: ${({ theme }) => theme.color.neutral[11]};
    ${hoverIconStyle};
  }
  &:disabled {
    background-color: ${({ theme }) => theme.color.neutral[6]};
    color: ${({ theme }) => theme.color.neutral[4]};
    & * {
      stroke: ${({ theme }) => theme.color.neutral[5]};
    }
  }
`;

export default FullButtonRightIcon;
