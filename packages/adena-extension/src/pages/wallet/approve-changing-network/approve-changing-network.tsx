import React from 'react';
import ApproveChangingNetworkLayout from '@layouts/approve-changing-network-layout/approve-changing-network-layout';
import ApproveChangingNetworkContainer from './approve-changing-network-container';

export default function ApproveChangingNetworkPage(): JSX.Element {
  return (
    <ApproveChangingNetworkLayout approveChangingNetwork={<ApproveChangingNetworkContainer />} />
  );
}
