import React from 'react';
import styled, { useTheme } from 'styled-components';

import { Text, Icon } from '@components/atoms';
import { getTheme } from '@styles/theme';
import mixins from '@styles/mixins';

interface MultiButtonProps {
  title: string;
  subTitle: string;
  disabled?: boolean;
  onClick: () => unknown;
}

export const MultilineTextWithArrowButton = ({
  title,
  subTitle,
  disabled = false,
  onClick,
}: MultiButtonProps): JSX.Element => {
  const theme = useTheme();
  const onClickWrapper = (): void => {
    if (disabled) {
      return;
    }
    onClick();
  };

  return (
    <Wrapper disabled={disabled} onClick={onClickWrapper}>
      <Text type='body1Bold'>{title}</Text>
      <Text type='body2Reg' color={theme.neutral.a}>
        {subTitle}
      </Text>
      <Icon name='iconArrowV2' className='arrow-icon' />
    </Wrapper>
  );
};

const Wrapper = styled.button`
  ${mixins.flex({ align: 'flex-start' })};
  position: relative;
  width: 100%;
  height: 80px;
  border-radius: 18px;
  padding: 15px 20px;
  background-color: ${getTheme('neutral', '_7')};
  cursor: pointer;

  .arrow-icon {
    ${mixins.posTopCenterRight('24px')};
  }

  ${({ disabled, theme }): string | false =>
    disabled === false &&
    `
      transition: all 0.3s ease;
      &:hover {
        background-color: ${theme.neutral.b};
        .arrow-icon * {
          stroke: ${theme.neutral._1};
        }
      }
    `}
  & + & {
    margin-top: 12px;
  }
`;
