import React from 'react';
import styled, { CSSProp } from 'styled-components';
import { LeftArrowBtn } from '@components/buttons/arrow-buttons';
import { useLocation, useNavigate } from 'react-router-dom';
import Text from '@components/text';

interface ArrowTitleMenuProps {
  title?: string;
}

const Wrapper = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  width: 100%;
  height: 100%;
  border-bottom: 1px solid ${({ theme }): string => theme.color.neutral[6]};
  position: relative;
  padding: 0px 18px 0px 12px;
`;

const Button = styled(LeftArrowBtn)`
  position: absolute;
  left: 12px;
`;

export const ArrowTitleMenu = ({ title }: ArrowTitleMenuProps): JSX.Element => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const handlePrevButtonClick = (): void => navigate(-1);

  return (
    <Wrapper>
      <Button onClick={handlePrevButtonClick} tabIndex={0} />
      {title && <Text type='body1Bold'>{title}</Text>}
    </Wrapper>
  );
};
