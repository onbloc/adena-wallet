import React, { useCallback } from 'react';
import UnderlineTextButton from '@components/common/underline-text-button/underline-text-button';

export interface RemoveNetworkButtonProps {
  removeNetwork: () => void;
}

const RemoveNetworkButton: React.FC<RemoveNetworkButtonProps> = ({ removeNetwork }) => {
  const onClickButton = useCallback(() => {
    removeNetwork();
  }, [removeNetwork]);

  return (
    <UnderlineTextButton
      text='Remove Network'
      onClick={onClickButton}
    />
  )
};

export default RemoveNetworkButton;