import React from 'react';
import styled from 'styled-components';

import { Text, Icon } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import useAppNavigate from '@hooks/use-app-navige';

interface CloseTitleMenuProps {
  title?: string;
}

const Wrapper = styled.div`
  ${mixins.flex({ direction: 'row' })};
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
  position: relative;
  padding: 0px 18px 0px 12px;
`;

const Button = styled.button`
  position: absolute;
  width: 14px;
  height: 14px;
  right: 12px;

  .icon-close {
    * {
      stroke: ${getTheme('neutral', 'a')};
      transition: 0.2s;
    }
  }

  &:hover {
    * {
      stroke: ${getTheme('neutral', '_1')};
    }
  }
`;

export const CloseTitleMenu = ({ title }: CloseTitleMenuProps): JSX.Element => {
  const { goBack } = useAppNavigate();

  return (
    <Wrapper>
      {title && <Text type='body1Bold'>{title}</Text>}
      <Button onClick={goBack} tabIndex={0}>
        <Icon name='iconCancel' className='icon-close' />
      </Button>
    </Wrapper>
  );
};
