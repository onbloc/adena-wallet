import React from 'react';
import { ApproveChangingNetworkLayoutWrapper } from './approve-changing-network-layout.styles';

export interface ApproveChangingNetworkLayoutProps {
  approveChangingNetwork: React.ReactNode;
}

const ApproveChangingNetworkLayout: React.FC<ApproveChangingNetworkLayoutProps> = ({
  approveChangingNetwork,
}) => {
  return (
    <ApproveChangingNetworkLayoutWrapper>
      {approveChangingNetwork}
    </ApproveChangingNetworkLayoutWrapper>
  );
};

export default ApproveChangingNetworkLayout;
