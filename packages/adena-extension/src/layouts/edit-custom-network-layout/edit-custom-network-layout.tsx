import React from 'react';
import { EditCustomNetworkLayoutWrapper } from './edit-custom-network-layout.styles';

export interface EditCustomNetworkLayoutProps {
  editCustomNetwork: React.ReactNode;
}

const EditCustomNetworkLayout: React.FC<EditCustomNetworkLayoutProps> = ({
  editCustomNetwork,
}) => {
  return (
    <EditCustomNetworkLayoutWrapper>
      {editCustomNetwork}
    </EditCustomNetworkLayoutWrapper>
  );
};

export default EditCustomNetworkLayout;