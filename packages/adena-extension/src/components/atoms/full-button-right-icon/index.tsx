import React from 'react';
import styled, { CSSProp, css } from 'styled-components';

import { Text, Icon } from '@components/atoms';
import { FontsType } from '@styles/theme';

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
    stroke: ${({ theme, mode }): string =>
      mode === 'DANGER' ? theme.color.red[7] : theme.color.neutral[9]};
  }
  .icon-weblink * {
    transition: 0.2s;
    fill: ${({ theme, mode }): string =>
      mode === 'DANGER' ? theme.color.red[7] : theme.color.neutral[9]};
  }
`;

const hoverIconStyle = css<ButtonStyleProps>`
  .icon-arrow-v2 * {
    stroke: ${({ theme, mode }): string =>
      mode === 'DANGER' ? theme.color.red[2] : theme.color.neutral[0]};
  }
  .icon-weblink * {
    fill: ${({ theme, mode }): string =>
      mode === 'DANGER' ? theme.color.red[2] : theme.color.neutral[0]};
  }
`;

const ButtonWrapper = styled.button<ButtonStyleProps>`
  & + & {
    margin-top: ${({ gap }): string | undefined => (typeof gap === 'number' ? gap + 'px' : gap)};
  }
  ${defaultIconStyle};
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  height: 54px;
  padding: 0px 24px 0px 20px;
  border-radius: 18px;
  transition: all 0.3s ease;
  background-color: ${({ theme }): string => theme.color.neutral[6]};
  color: ${({ theme, mode }): string =>
    mode === 'DANGER' ? theme.color.red[2] : theme.color.neutral[0]};
  &:hover {
    background-color: ${({ theme }): string => theme.color.neutral[11]};
    ${hoverIconStyle};
  }
`;
