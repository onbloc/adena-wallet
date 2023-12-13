import React from 'react';
import ChangeNetworkLayout from '@layouts/change-network-layout/change-network-layout';
import ChangeNetworkContainer from './change-network-container';

export default function ChangeNetwork(): JSX.Element {
  return <ChangeNetworkLayout changeNetwork={<ChangeNetworkContainer />} />;
}
