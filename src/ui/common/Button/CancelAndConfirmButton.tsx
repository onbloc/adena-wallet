import React from 'react';
import styled from 'styled-components';
import { Wrapper, LeftBtn, RightBtn } from './DubbleButton';

interface DefaultButtonProps {
  onClick: () => void;
  props?: React.ComponentPropsWithoutRef<'button'>;
}

interface ConfirmButtonProps extends DefaultButtonProps {
  text: string;
}

interface CancelAndConfirmLocation {
  cancelButtonProps: DefaultButtonProps;
  confirmButtonProps: ConfirmButtonProps;
}

const ExtendWrap = styled(Wrapper)`
  position: absolute;
  bottom: 0px;
`;

const CancelAndConfirmButton = ({
  cancelButtonProps,
  confirmButtonProps,
}: CancelAndConfirmLocation) => {
  return (
    <ExtendWrap>
      <LeftBtn onClick={cancelButtonProps.onClick} {...cancelButtonProps.props}>
        Cancel
      </LeftBtn>
      <RightBtn onClick={confirmButtonProps.onClick} {...confirmButtonProps.props}>
        {confirmButtonProps.text}
      </RightBtn>
    </ExtendWrap>
  );
};

export default CancelAndConfirmButton;
