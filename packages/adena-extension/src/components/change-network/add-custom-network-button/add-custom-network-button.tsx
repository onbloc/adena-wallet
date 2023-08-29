import React, { useCallback } from 'react';
import UnderlineTextButton from '@components/common/underline-text-button/underline-text-button';

export interface AddCustomNetworkButtonProps {
  onClick: () => void;
}

const AddCustomNetworkButton: React.FC<AddCustomNetworkButtonProps> = ({ onClick }) => {
  const onClickButton = useCallback(() => {
    onClick();
  }, [onClick]);

  return <UnderlineTextButton
    text='Add Custom Network'
    onClick={onClickButton}
  />
};

export default AddCustomNetworkButton;