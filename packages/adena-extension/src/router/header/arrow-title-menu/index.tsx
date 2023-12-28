import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

import { Text, LeftArrowBtn } from '@components/atoms';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';

interface ArrowTitleMenuProps {
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

const Button = styled(LeftArrowBtn)`
  position: absolute;
  left: 12px;
`;

export const ArrowTitleMenu = ({ title }: ArrowTitleMenuProps): JSX.Element => {
  const navigate = useNavigate();

  const handlePrevButtonClick = (): void => navigate(-1);

  return (
    <Wrapper>
      <Button onClick={handlePrevButtonClick} tabIndex={0} />
      {title && <Text type='body1Bold'>{title}</Text>}
    </Wrapper>
  );
};
