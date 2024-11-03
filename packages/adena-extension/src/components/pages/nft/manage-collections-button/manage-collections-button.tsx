import MainManageTokensFilterIcon from '@assets/main-manage-tokens-filter.svg';
import React from 'react';
import { ManageCollectionsButtonWrapper } from './manage-collections-button.styles';

export interface ManageCollectionsButtonProps {
  onClick: () => void;
}

const ManageCollectionsButton: React.FC<ManageCollectionsButtonProps> = ({ onClick }) => {
  return (
    <ManageCollectionsButtonWrapper onClick={onClick}>
      <img className='icon' src={MainManageTokensFilterIcon} alt={'mange token filter icon'} />
      <span className='title'>{'Manage Collectables'}</span>
    </ManageCollectionsButtonWrapper>
  );
};

export default ManageCollectionsButton;
