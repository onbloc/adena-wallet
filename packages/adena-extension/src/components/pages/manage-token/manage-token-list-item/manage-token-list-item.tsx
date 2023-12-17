import React from 'react';
import { ManageTokenListItemWrapper } from './manage-token-list-item.styles';
import ManageTokenListItemBalance from '@components/pages/manage-token/manage-token-list-item-balance/manage-token-list-item-balance';
import { ManageTokenInfo } from '@types';

import Toggle from '../toggle';

export interface ManageTokenListItemProps {
  token: ManageTokenInfo;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

const ManageTokenListItem: React.FC<ManageTokenListItemProps> = ({ token, onToggleActiveItem }) => {
  const { main, tokenId, logo, name, balanceAmount, display } = token;

  return (
    <ManageTokenListItemWrapper>
      <div className='logo-wrapper'>
        <img className='logo' src={logo} alt='token img' />
      </div>

      <div className='name-wrapper'>
        <span className='name'>{name}</span>
        <ManageTokenListItemBalance amount={balanceAmount} />
      </div>

      <div className='toggle-wrapper'>
        {!main && (
          <Toggle
            activated={display === true}
            onToggle={(): void => onToggleActiveItem(tokenId, !display)}
          />
        )}
      </div>
    </ManageTokenListItemWrapper>
  );
};

export default ManageTokenListItem;
