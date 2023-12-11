import React from 'react';

import { NetworkListWrapper } from './network-list.styles';
import NetworkListItem from '../network-list-item/network-list-item';
import { NetworkMetainfo } from '@types';

export interface NetworkListProps {
  currentNetworkId: string;
  networkMetainfos: NetworkMetainfo[];
  changeNetwork: (networkMetainfoId: string) => void;
  moveEditPage: (networkMetainfoId: string) => void;
}

const NetworkList: React.FC<NetworkListProps> = ({
  currentNetworkId,
  networkMetainfos,
  changeNetwork,
  moveEditPage,
}) => {
  return (
    <NetworkListWrapper>
      {networkMetainfos.map((networkMetainfo, index) => (
        <NetworkListItem
          key={index}
          selected={networkMetainfo.id === currentNetworkId}
          locked={networkMetainfo.default === true}
          networkMetainfo={networkMetainfo}
          changeNetwork={changeNetwork}
          moveEditPage={moveEditPage}
        />
      ))}
    </NetworkListWrapper>
  );
};

export default NetworkList;
