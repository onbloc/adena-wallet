import {
  UnderlineTextButton,
} from '@components/molecules';
import React, {
  useCallback,
} from 'react';

export interface RemoveNetworkButtonProps {
  text: string;
  clearNetwork: () => void;
}

const RemoveNetworkButton: React.FC<RemoveNetworkButtonProps> = ({
  text, clearNetwork,
}) => {
  const onClickButton = useCallback(() => {
    clearNetwork();
  }, [clearNetwork]);

  return <UnderlineTextButton text={text} onClick={onClickButton} />;
};

export default RemoveNetworkButton;
