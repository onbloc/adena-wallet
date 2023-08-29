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
      {addCustomNetwork}
    </AddCustomNetworkLayoutWrapper>
  );
};

export default AddCustomNetworkLayout;