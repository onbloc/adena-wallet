import React, { ReactElement } from 'react';
import styled, { CSSProp } from 'styled-components';

import { Text, Button, ButtonHierarchy } from '@components/atoms';

interface DefaultButtonProps {
  onClick: () => void;
  props?: React.ComponentPropsWithoutRef<'button'>;
}

interface ConfirmButtonProps extends DefaultButtonProps {
  text: string;
  hierarchy?: ButtonHierarchy;
}

interface CancelAndConfirmLocation {
  cancelButtonProps: DefaultButtonProps;
  confirmButtonProps: ConfirmButtonProps;
}

const Wrapper = styled.div`
  margin-top: auto;
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'space-between')};
  width: 100%;
  gap: 10px;
`;

export const CancelAndConfirmButton = ({
  cancelButtonProps,
  confirmButtonProps,
}: CancelAndConfirmLocation): ReactElement => {
  return (
    <Wrapper>
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        onClick={cancelButtonProps.onClick}
        {...cancelButtonProps.props}
      >
        <Text type='body1Bold'>Cancel</Text>
      </Button>
      <Button
        fullWidth
        hierarchy={confirmButtonProps.hierarchy ?? ButtonHierarchy.Primary}
        onClick={confirmButtonProps.onClick}
        {...confirmButtonProps.props}
      >
        <Text type='body1Bold'>{confirmButtonProps.text}</Text>
      </Button>
    </Wrapper>
  );
};
