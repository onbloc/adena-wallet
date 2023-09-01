import React from 'react';
import ApproveAddingNetworkLayout from '@layouts/approve-adding-network-layout/approve-adding-network-layout';
import ApproveAddingNetworkContainer from '@containers/approve-adding-network-container/approve-adding-network-container';

export default function ApproveAddingNetworkPage() {
  return (
    <ApproveAddingNetworkLayout
      approveAddingNetwork={<ApproveAddingNetworkContainer />}
    />
  );
}