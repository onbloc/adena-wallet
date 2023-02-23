import React from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import theme from '@styles/theme';
import Icon from '@components/icons';

interface MultiButtonProps {
  title: string;
  subTitle: string;
  disabled?: boolean;
  onClick: () => unknown;
}

export const MultilineTextWithArrowButton = ({ title, subTitle, disabled = false, onClick }: MultiButtonProps) => {

  const onClickWrapper = () => {
    if (disabled) {
      return;
    }
    onClick();
  };

  return (
    <Wrapper disabled={disabled} onClick={onClickWrapper}>
      <Text type='body1Bold'>{title}</Text>
      <Text type='body2Reg' color={theme.color.neutral[9]}>
        {subTitle}
      </Text>
      <Icon name='iconArrowV2' className='arrow-icon' />
    </Wrapper>
  );
};

const Wrapper = styled.button`
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'center')};
  position: relative;
  width: 100%;
  height: 80px;
  border-radius: 18px;
  padding: 15px 20px;
  background-color: ${theme.color.neutral[6]};
  cursor: pointer;

  .arrow-icon {
    ${({ theme }) => theme.mixins.posTopCenterRight('24px')};
  }

  ${({ disabled, theme }) => disabled === false &&
    `
      transition: all 0.3s ease;
      &:hover {
        background-color: ${theme.color.neutral[11]};
        .arrow-icon * {
          stroke: ${theme.color.neutral[0]};
        }
      }
    `
  }
  & + & {
    margin-top: 12px;
  }
`;
