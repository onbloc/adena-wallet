import React from 'react';
import { ApproveChangingNetworkItemWrapper } from './approve-changing-network-item.styles';
import UnknownLogo from '@assets/common-unknown-logo.svg';

export interface ApproveChangingNetworkItemProps {
  name: string;
  logo?: string;
}

const ApproveChangingNetworkItem: React.FC<ApproveChangingNetworkItemProps> = ({
  name,
  logo,
}) => {
  return (
    <ApproveChangingNetworkItemWrapper>
      <img src={logo || UnknownLogo} alt='logo' />
      <span className='chain-name'>{name}</span>
    </ApproveChangingNetworkItemWrapper>
  );
};

export default ApproveChangingNetworkItem;