import React from 'react';
import styled, { css } from 'styled-components';

import { Text, Icon } from '@components/atoms';
import { FontsType, getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

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

export const FullButtonRightIcon = ({
  title,
  textType = 'body1Bold',
  mode = 'DEFAULT',
  className,
  disabled,
  onClick,
  gap = 12,
  icon = 'ARROW',
}: ButtonProps): JSX.Element => {
  if (disabled) return <></>;
  return (
    <ButtonWrapper className={className} onClick={onClick} mode={mode} gap={gap}>
      <Text type={textType} color='inherit'>
        {title}
      </Text>
      {icon === 'ARROW' && <Icon name='iconArrowV2' className='icon-arrow-v2' />}
      {icon === 'WEBLINK' && <Icon name='iconWebLink' className='icon-weblink' />}
    </ButtonWrapper>
  );
};

const defaultIconStyle = css<ButtonStyleProps>`
  .icon-arrow-v2 * {
    transition: 0.2s;
    stroke: ${({ theme, mode }): string => (mode === 'DANGER' ? theme.red.b : theme.neutral.a)};
  }
  .icon-weblink * {
    transition: 0.2s;
    fill: ${({ theme, mode }): string => (mode === 'DANGER' ? theme.red.b : theme.neutral.a)};
  }
`;

const hoverIconStyle = css<ButtonStyleProps>`
  .icon-arrow-v2 * {
    stroke: ${({ theme, mode }): string => (mode === 'DANGER' ? theme.red._5 : theme.neutral._1)};
  }
  .icon-weblink * {
    fill: ${({ theme, mode }): string => (mode === 'DANGER' ? theme.red._5 : theme.neutral._1)};
  }
`;

const ButtonWrapper = styled.button<ButtonStyleProps>`
  & + & {
    margin-top: ${({ gap }): string | undefined => (typeof gap === 'number' ? gap + 'px' : gap)};
  }
  ${defaultIconStyle};
  ${mixins.flex({ direction: 'row', justify: 'space-between' })};
  width: 100%;
  height: 54px;
  padding: 0px 24px 0px 20px;
  border-radius: 18px;
  transition: all 0.3s ease;
  background-color: ${getTheme('neutral', '_7')};
  color: ${({ theme, mode }): string => (mode === 'DANGER' ? theme.red._5 : theme.neutral._1)};
  &:hover {
    background-color: ${getTheme('neutral', 'b')};
    ${hoverIconStyle};
  }
`;
