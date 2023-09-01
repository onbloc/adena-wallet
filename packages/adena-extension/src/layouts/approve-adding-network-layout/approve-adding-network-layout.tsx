import React from 'react';
import { ApproveAddingNetworkLayoutWrapper } from './approve-adding-network-layout.styles';

export interface ApproveAddingNetworkLayoutProps {
  approveAddingNetwork: React.ReactNode;
}

const ApproveAddingNetworkLayout: React.FC<ApproveAddingNetworkLayoutProps> = ({
  approveAddingNetwork,
}) => {
  return (
    <ApproveAddingNetworkLayoutWrapper>
      {approveAddingNetwork}
    </ApproveAddingNetworkLayoutWrapper>
  );
};

export default ApproveAddingNetworkLayout;