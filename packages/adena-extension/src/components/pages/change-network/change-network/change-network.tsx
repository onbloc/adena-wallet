import React from 'react';

import { BottomFixedButton } from '@components/molecules';
import type { ChainGroup } from '@hooks/use-network';
import { NetworkState } from '@states';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';

type NetworkMode = NetworkState.NetworkMode;

import ChainGroupSection from '../chain-group-section';
import LoadingChangeNetwork from '../loading-change-network';
import TestnetModeToggle from '../testnet-mode-toggle';

import { ChangeNetworkWrapper } from './change-network.styles';

export interface ChainGroupSectionModel {
  chainGroup: ChainGroup;
  displayName: string;
  networks: Array<NetworkMetainfo | AtomoneNetworkMetainfo>;
  selectedNetworkId: string | null;
  iconUrl?: string;
  canAdd: boolean;
}

export interface ChangeNetworkProps {
  loading: boolean;
  networkMode: NetworkMode;
  sections: ChainGroupSectionModel[];
  onChangeMode: (mode: NetworkMode) => void;
  onSelect: (chainGroup: ChainGroup, networkId: string) => void;
  onEdit: (chainGroup: ChainGroup, networkId: string) => void;
  onAdd: (chainGroup: ChainGroup) => void;
  moveBack: () => void;
}

const ChangeNetwork: React.FC<ChangeNetworkProps> = ({
  loading,
  networkMode,
  sections,
  onChangeMode,
  onSelect,
  onEdit,
  onAdd,
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
            <TestnetModeToggle mode={networkMode} onChange={onChangeMode} />
            {sections.map((section) => (
              <ChainGroupSection
                key={section.chainGroup}
                chainGroup={section.chainGroup}
                displayName={section.displayName}
                networks={section.networks}
                selectedNetworkId={section.selectedNetworkId}
                iconUrl={section.iconUrl}
                canAdd={section.canAdd}
                onSelect={onSelect}
                onEdit={onEdit}
                onAdd={onAdd}
              />
            ))}
          </>
        )}
      </div>
      <BottomFixedButton onClick={moveBack} />
    </ChangeNetworkWrapper>
  );
};

export default ChangeNetwork;
