import EditCustomNetworkConatiner from '@containers/edit-custom-network-conatiner/edit-custom-network-conatiner';
import EditCustomNetworkLayout from '@layouts/edit-custom-network-layout/edit-custom-network-layout';
import React from 'react';

export default function EditCustomNetworkPage() {
  return (
    <EditCustomNetworkLayout
      editCustomNetwork={<EditCustomNetworkConatiner />}
    />
  );
}