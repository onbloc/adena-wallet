import {
  UnderlineTextButton,
} from '@components/molecules';
import React, {
  useCallback,
} from 'react';

export interface AddCustomNetworkButtonProps {
  onClick: () => void
}

const AddCustomNetworkButton: React.FC<AddCustomNetworkButtonProps> = ({
  onClick,
}) => {
  const onClickButton = useCallback(() => {
    onClick();
  }, [onClick]);

  return <UnderlineTextButton text='Add Custom Network' onClick={onClickButton} />;
};

export default AddCustomNetworkButton;
