import React from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, Button, ButtonHierarchy } from '@components/atoms';

interface Props {
  onClick: () => void;
}

export const CloseShadowButton = ({ onClick }: Props): JSX.Element => {
  return (
    <ButtonWrap>
      <Button fullWidth hierarchy={ButtonHierarchy.Dark} onClick={onClick}>
        <Text type='body1Bold'>Close</Text>
      </Button>
    </ButtonWrap>
  );
};

const ButtonWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
  position: fixed;
  bottom: 0px;
  left: 0px;
  width: 100%;
  height: 96px;
  padding: 0px 20px;
  box-shadow: 0px -4px 4px rgba(0, 0, 0, 0.4);
  background-color: ${({ theme }): string => theme.color.neutral[7]};
  z-index: 1;
`;
