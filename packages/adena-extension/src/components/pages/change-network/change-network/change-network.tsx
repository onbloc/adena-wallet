import React from 'react';

import { BottomFixedButton } from '@components/molecules';
import { ChangeNetworkWrapper } from './change-network.styles';
import NetworkList from '../network-list/network-list';
import AddCustomNetworkButton from '../add-custom-network-button/add-custom-network-button';
import LoadingChangeNetwork from '../loading-change-network';

import { NetworkMetainfo } from '@types';

export interface ChangeNetworkProps {
  loading: boolean;
  currentNetworkId: string;
  networkMetainfos: NetworkMetainfo[];
  changeNetwork: (networkMetainfoId: string) => void;
  moveAddPage: () => void;
  moveEditPage: (networkMetainfoId: string) => void;
  moveBack: () => void;
}

const ChangeNetwork: React.FC<ChangeNetworkProps> = ({
  loading,
  currentNetworkId,
  networkMetainfos,
  changeNetwork,
  moveAddPage,
  moveEditPage,
  moveBack,
}) => {
  return (
    <ChangeNetworkWrapper>
      <div className='content-wrapper'>
        <h4 className='title'>Change Network</h4>
        {loading ? (
          <LoadingChangeNetwork />
        ) : (
          <>
            <NetworkList
              currentNetworkId={currentNetworkId}
              networkMetainfos={networkMetainfos}
              changeNetwork={changeNetwork}
              moveEditPage={moveEditPage}
            />
            <AddCustomNetworkButton onClick={moveAddPage} />
          </>
        )}
      </div>
      <BottomFixedButton onClick={moveBack} />
    </ChangeNetworkWrapper>
  );
};

export default ChangeNetwork;
