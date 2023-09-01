import React from 'react';
import { ApproveAddingNetworkTableWrapper } from './approve-adding-network-table.styles';

export interface ApproveAddingNetworkTableProps {
  name: string;
  rpcUrl: string;
  chainId: string;
}

const ApproveAddingNetworkTable: React.FC<ApproveAddingNetworkTableProps> = ({
  name,
  rpcUrl,
  chainId,
}) => {
  return (
    <ApproveAddingNetworkTableWrapper>
      <div className='table-row'>
        <span className='title'>Name</span>
        <span className='value'>{name}</span>
      </div>
      <div className='table-row'>
        <span className='title'>RPC URL</span>
        <span className='value'>{rpcUrl}</span>
      </div>
      <div className='table-row'>
        <span className='title'>Chain ID</span>
        <span className='value'>{chainId}</span>
      </div>
    </ApproveAddingNetworkTableWrapper>
  );
};

export default ApproveAddingNetworkTable;