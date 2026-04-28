import React, { useCallback } from 'react';

import IconPlus from '@assets/plus.svg';
import type { ChainGroup } from '@hooks/use-network';
import { AtomoneNetworkMetainfo, NetworkMetainfo } from '@types';

import NetworkList from '../network-list/network-list';
import { ChainGroupSectionWrapper } from './chain-group-section.styles';

export interface ChainGroupSectionProps {
  chainGroup: ChainGroup;
  displayName: string;
  networks: Array<NetworkMetainfo | AtomoneNetworkMetainfo>;
  selectedNetworkId: string | null;
  iconUrl?: string;
  canAdd: boolean;
  onSelect: (chainGroup: ChainGroup, networkId: string) => void;
  onEdit: (chainGroup: ChainGroup, networkId: string) => void;
  onAdd: (chainGroup: ChainGroup) => void;
}

const ChainGroupSection: React.FC<ChainGroupSectionProps> = ({
  chainGroup,
  displayName,
  networks,
  selectedNetworkId,
  iconUrl,
  canAdd,
  onSelect,
  onEdit,
  onAdd,
}) => {
  const onClickAdd = useCallback(() => {
    onAdd(chainGroup);
  }, [chainGroup, onAdd]);

  const changeNetwork = useCallback(
    (networkId: string) => {
      onSelect(chainGroup, networkId);
    },
    [chainGroup, onSelect],
  );

  const moveEditPage = useCallback(
    (networkId: string) => {
      onEdit(chainGroup, networkId);
    },
    [chainGroup, onEdit],
  );

  return (
    <ChainGroupSectionWrapper>
      <div className='section-header'>
        <span className='chain-name'>{displayName}</span>
        {canAdd && (
          <button type='button' className='add-button' onClick={onClickAdd} aria-label='Add'>
            <img className='plus-icon' src={IconPlus} alt='add' />
          </button>
        )}
      </div>
      {networks.length === 0 ? (
        <div className='empty'>No networks available</div>
      ) : (
        <NetworkList
          currentNetworkId={selectedNetworkId ?? ''}
          networkMetainfos={networks}
          iconUrl={iconUrl}
          changeNetwork={changeNetwork}
          moveEditPage={moveEditPage}
        />
      )}
    </ChainGroupSectionWrapper>
  );
};

export default ChainGroupSection;
