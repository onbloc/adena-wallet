import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';
import React from 'react';

import NetworkListItem from '../network-list-item/network-list-item';
import { NetworkListWrapper } from './network-list.styles';

export interface NetworkListProps {
  currentNetworkId: string;
  networkMetainfos: Array<NetworkMetainfo | AtomoneNetworkMetainfo>;
  iconUrl?: string;
  changeNetwork: (networkMetainfoId: string) => void;
  moveEditPage: (networkMetainfoId: string) => void;
}

const NetworkList: React.FC<NetworkListProps> = ({
  currentNetworkId,
  networkMetainfos,
  iconUrl,
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
          iconUrl={iconUrl}
          changeNetwork={changeNetwork}
          moveEditPage={moveEditPage}
        />
      ))}
    </NetworkListWrapper>
  );
};

export default NetworkList;
