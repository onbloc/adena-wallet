import React from 'react';
import EditCustomNetworkLayout from '@layouts/edit-custom-network-layout/edit-custom-network-layout';
import EditCustomNetworkContainer from './edit-custom-network-container';

export default function EditCustomNetworkPage(): JSX.Element {
  return <EditCustomNetworkLayout editCustomNetwork={<EditCustomNetworkContainer />} />;
}
