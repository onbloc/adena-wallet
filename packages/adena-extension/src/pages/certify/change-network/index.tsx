import React from 'react';
import ChangeNetworkLayout from '@layouts/change-network-layout/change-network-layout';
import ChangeNetworkContainer from '@containers/change-network-container/change-network-container';

export default function ChangeNetwork() {
  return (
    <ChangeNetworkLayout
      changeNetwork={<ChangeNetworkContainer />}
    />
  );
}