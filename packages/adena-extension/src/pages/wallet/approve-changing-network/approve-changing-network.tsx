import React from 'react';
import ApproveChangingNetworkLayout from '@layouts/approve-changing-network-layout/approve-changing-network-layout';
import ApproveChangingNetworkContainer from '@containers/approve-changing-network-container/approve-changing-network-container';

export default function ApproveChangingNetworkPage() {
  return (
    <ApproveChangingNetworkLayout
      approveChangingNetwork={<ApproveChangingNetworkContainer />}
    />
  );
}