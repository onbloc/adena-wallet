import React from 'react';
import AddCustomNetworkLayout from '@layouts/add-custom-network-layout/add-custom-network-layout';
import AddCustomNetworkContainer from './add-custom-network-conatiner';

export default function AddCustomNetworkPage(): JSX.Element {
  return <AddCustomNetworkLayout addCustomNetwork={<AddCustomNetworkContainer />} />;
}
