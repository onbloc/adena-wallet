import { LeftArrowBtn, Text } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import React, { type JSX } from 'react';
import styled from 'styled-components';

interface ArrowTitleMenuProps { title?: string }

const Wrapper = styled.div`
  ${mixins.flex({ direction: 'row' })};
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${getTheme('neutral', '_7')};
  position: relative;
  padding: 0px 18px 0px 12px;
`;

const Button = styled(LeftArrowBtn)`
  position: absolute;
  left: 12px;
`;

export const ArrowTitleMenu = ({ title }: ArrowTitleMenuProps): JSX.Element => {
  const { goBack } = useAppNavigate();

  return (
    <Wrapper>
      <Button onClick={goBack} tabIndex={0} />
      {title && <Text type='body1Bold'>{title}</Text>}
    </Wrapper>
  );
};
