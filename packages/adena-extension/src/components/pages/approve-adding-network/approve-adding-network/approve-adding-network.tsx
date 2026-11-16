import React, { useEffect, useMemo } from 'react';

import { SubHeader, WarningBox } from '@components/atoms';
import { BottomFixedLoadingButtonGroup } from '@components/molecules';

import UnknownLogo from '@assets/common-unknown-logo.svg';
import ApproveAddingNetworkTable from '../approve-adding-network-table/approve-adding-network-table';
import { ApproveAddingNetworkWrapper } from './approve-adding-network.styles';

export interface AddingNetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
}

export interface ApproveAddingNetworkProps {
  networkInfo: AddingNetworkInfo;
  logo?: string;
  approvable: boolean;
  processing: boolean;
  done: boolean;
  cancel: () => void;
  approve: () => void;
  onResponse: () => void;
  onTimeout: () => void;
}

const ApproveAddingNetwork: React.FC<ApproveAddingNetworkProps> = ({
  networkInfo,
  logo,
  approvable,
  processing,
  done,
  cancel,
  approve,
  onResponse,
}) => {
  const title = useMemo(() => `Add ${networkInfo.name}`, [networkInfo.name]);

  useEffect(() => {
    if (done) {
      onResponse();
    }
  }, [done, onResponse]);

  return (
    <ApproveAddingNetworkWrapper>
      <SubHeader title={title} />
      <div className='logo-wrapper'>
        <img src={logo || UnknownLogo} alt='logo' />
      </div>

      <WarningBox padding={'10px 18px'} type='addingNetwork' />

      <div className='table-wrapper'>
        <ApproveAddingNetworkTable
          name={networkInfo.name}
          rpcUrl={networkInfo.rpcUrl}
          chainId={networkInfo.chainId}
        />
      </div>

      <BottomFixedLoadingButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: cancel,
        }}
        rightButton={{
          primary: true,
          loading: processing,
          disabled: approvable === false,
          text: 'Approve',
          onClick: approve,
        }}
      />
    </ApproveAddingNetworkWrapper>
  );
};

export default ApproveAddingNetwork;
