import React from 'react';
import { AddCustomNetworkLayoutWrapper } from './add-custom-network-layout.styles';

export interface AddCustomNetworkLayoutProps {
  addCustomNetwork: React.ReactNode;
}

const AddCustomNetworkLayout: React.FC<AddCustomNetworkLayoutProps> = ({
  addCustomNetwork,
}) => {
  return (
    <AddCustomNetworkLayoutWrapper>
      <div className='add-custon-network-container'>
        {addCustomNetwork}
      </div>
    </AddCustomNetworkLayoutWrapper>
  );
};

export default AddCustomNetworkLayout;