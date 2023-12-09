import EditCustomNetworkContainer from '@containers/edit-custom-network-container/edit-custom-network-container';
import EditCustomNetworkLayout from '@layouts/edit-custom-network-layout/edit-custom-network-layout';
import React from 'react';

export default function EditCustomNetworkPage(): JSX.Element {
  return <EditCustomNetworkLayout editCustomNetwork={<EditCustomNetworkContainer />} />;
}
