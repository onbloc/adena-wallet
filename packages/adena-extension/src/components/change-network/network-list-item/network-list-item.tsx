import React, { useCallback } from 'react';
import { NetworkListItemWrapper } from './network-list-item.styles';
import { NetworkMetainfo } from '@states/network';
import IconCheck from '@assets/check-circle.svg';
import IconLock from '@assets/icon-lock-small';
import IconEdit from '@assets/icon-edit-small';

export interface NetworkListItemProps {
  selected: boolean;
  locked: boolean;
  networkMetainfo: NetworkMetainfo;
  moveEditPage: (networkMetainfoId: string) => void;
  changeNetwork: (networkMetainfoId: string) => void;
}

const NetworkListItem: React.FC<NetworkListItemProps> = ({
  selected,
  locked,
  networkMetainfo,
  moveEditPage,
  changeNetwork,
}) => {
  const onClickEditButton = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      if (locked) {
        return;
      }
      moveEditPage(networkMetainfo.id);
    },
    [locked, moveEditPage, networkMetainfo.id],
  );

  const onClickItem = useCallback(() => {
    changeNetwork(networkMetainfo.id);
  }, [changeNetwork, networkMetainfo.id]);

  return (
    <NetworkListItemWrapper onClick={onClickItem}>
      <div className='info-wrapper'>
        <div className='name-wrapper'>
          <span className='name'>{networkMetainfo.networkName}</span>
          <div className='icon-wrapper' onClick={onClickEditButton}>
            {locked ? <IconLock /> : <IconEdit className='icon-edit' />}
          </div>
        </div>
        <div className='description-wrapper'>
          <span className='description'>{networkMetainfo.rpcUrl}</span>
        </div>
      </div>
      {selected && (
        <div className='selected-wrapper'>
          <img className='icon-check' src={IconCheck} alt='check' />
        </div>
      )}
    </NetworkListItemWrapper>
  );
};

export default NetworkListItem;
