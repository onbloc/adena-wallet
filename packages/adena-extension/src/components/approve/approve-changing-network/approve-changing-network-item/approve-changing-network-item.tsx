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
      <div className='chain-name-wrapper'>
        <span className='chain-name'>{name}</span>
      </div>
    </ApproveChangingNetworkItemWrapper>
  );
};

export default ApproveChangingNetworkItem;