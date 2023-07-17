import React from 'react';
import AddCustomNetworkLayout from '@layouts/add-custom-network-layout/add-custom-network-layout';
import AddCustomNetworkConatiner from '@containers/add-custom-network-conatiner/add-custom-network-conatiner';

export default function AddCustomNetworkPage() {
  return (
    <AddCustomNetworkLayout
      addCustomNetwork={<AddCustomNetworkConatiner />}
    />
  );
}