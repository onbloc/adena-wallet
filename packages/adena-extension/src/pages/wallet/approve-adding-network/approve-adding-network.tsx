import React from 'react';
import ApproveAddingNetworkLayout from '@layouts/approve-adding-network-layout/approve-adding-network-layout';
import ApproveAddingNetworkContainer from './approve-adding-network-container';

export default function ApproveAddingNetworkPage(): JSX.Element {
  return <ApproveAddingNetworkLayout approveAddingNetwork={<ApproveAddingNetworkContainer />} />;
}
