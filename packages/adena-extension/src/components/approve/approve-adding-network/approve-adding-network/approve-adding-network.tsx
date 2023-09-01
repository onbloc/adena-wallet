import React, { useMemo } from 'react';
import { ApproveAddingNetworkWrapper } from './approve-adding-network.styles';
import SubHeader from '@components/common/sub-header/sub-header';
import UnknownLogo from '@assets/common-unknown-logo.svg';
import BottomFixedButtonGroup from '@components/buttons/bottom-fixed-button-group';
import WarningBox from '@components/warning/warning-box';
import ApproveAddingNetworkTable from '../approve-adding-network-table/approve-adding-network-table';

export interface AddingNetworkInfo {
  chainId: string;
  name: string;
  rpcUrl: string;
}

export interface ApproveAddingNetworkProps {
  networkInfo: AddingNetworkInfo;
  logo?: string;
  approvable: boolean;
  cancel: () => void;
  approve: () => void;
}

const ApproveAddingNetwork: React.FC<ApproveAddingNetworkProps> = ({
  networkInfo,
  logo,
  approvable,
  cancel,
  approve,
}) => {
  const title = useMemo(() => `Add ${networkInfo.name}`, [networkInfo.name])

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

      <BottomFixedButtonGroup
        fill
        leftButton={{
          text: 'Cancel',
          onClick: cancel
        }}
        rightButton={{
          primary: true,
          disabled: approvable === false,
          text: 'Approve',
          onClick: approve
        }}
      />
    </ApproveAddingNetworkWrapper>
  );
};

export default ApproveAddingNetwork;