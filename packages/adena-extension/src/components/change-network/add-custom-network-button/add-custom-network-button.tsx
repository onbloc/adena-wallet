import React from 'react';
import { AddCustomNetworkButtonWrapper } from './add-custom-network-button.styles';

export interface AddCustomNetworkButtonProps {
  onClick: () => void;
}

const AddCustomNetworkButton: React.FC<AddCustomNetworkButtonProps> = ({ onClick }) => {
  return (
    <AddCustomNetworkButtonWrapper onClick={onClick}>
      <span className='title'>{'Add Custom Network'}</span>
    </AddCustomNetworkButtonWrapper>
  );
};

export default AddCustomNetworkButton;