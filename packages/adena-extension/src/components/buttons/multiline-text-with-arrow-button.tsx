import React from 'react';
import styled from 'styled-components';
import arrowRight from '@assets/arrowS-right.svg';
import Text from '@components/text';
import theme from '@styles/theme';
import Icon from '@components/icons';

interface MultiButtonProps {
  title: string;
  subTitle: string;
  onClick: () => unknown;
}

export const MultilineTextWithArrowButton = ({ title, subTitle, onClick }: MultiButtonProps) => {
  return (
    <Wrapper onClick={onClick}>
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
  transition: all 0.3s ease;
  &:hover {
    background-color: ${({ theme }) => theme.color.neutral[11]};
    .arrow-icon * {
      stroke: ${theme.color.neutral[0]};
    }
  }
  .arrow-icon {
    ${({ theme }) => theme.mixins.posTopCenterRight('24px')};
  }
  & + & {
    margin-top: 12px;
  }
`;
