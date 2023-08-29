import React from 'react';
import { ChangeNetworkLayoutWrapper } from './change-network-layout.styles';

export interface ChangeNetworkLayoutProps {
  changeNetwork: React.ReactNode;
}

const ChangeNetworkLayout: React.FC<ChangeNetworkLayoutProps> = ({
  changeNetwork,
}) => {
  return (
    <ChangeNetworkLayoutWrapper>
      {changeNetwork}
    </ChangeNetworkLayoutWrapper>
  );
};

export default ChangeNetworkLayout;