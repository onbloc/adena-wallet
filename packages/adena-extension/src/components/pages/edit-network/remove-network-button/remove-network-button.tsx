import React, { useCallback } from 'react';
import { UnderlineTextButton } from '@components/molecules';

export interface RemoveNetworkButtonProps {
  removeNetwork: () => void;
}

const RemoveNetworkButton: React.FC<RemoveNetworkButtonProps> = ({ removeNetwork }) => {
  const onClickButton = useCallback(() => {
    removeNetwork();
  }, [removeNetwork]);

  return <UnderlineTextButton text='Remove Network' onClick={onClickButton} />;
};

export default RemoveNetworkButton;
