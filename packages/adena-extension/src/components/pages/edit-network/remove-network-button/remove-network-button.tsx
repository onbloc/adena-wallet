import React, { useCallback } from 'react';
import { UnderlineTextButton } from '@components/molecules';

export interface RemoveNetworkButtonProps {
  text: string;
  clearNetwork: () => void;
}

const RemoveNetworkButton: React.FC<RemoveNetworkButtonProps> = ({ text, clearNetwork }) => {
  const onClickButton = useCallback(() => {
    clearNetwork();
  }, [clearNetwork]);

  return <UnderlineTextButton text={text} onClick={onClickButton} />;
};

export default RemoveNetworkButton;
