import React from 'react';
import { ManageTokenListItemWrapper } from './manage-token-list-item.styles';
import { ManageToken } from '@components/manage-token/manage-token-list/manage-token-list';
import ManageTokenListItemBalance from '@components/manage-token/manage-token-list-item-balance/manage-token-list-item-balance';
import Toggle from '@components/common/toggle/toggle';

export interface ManageTokenListItemProps {
  token: ManageToken;
  onToggleActiveItem: (tokenId: string) => void;
}

const ManageTokenListItem: React.FC<ManageTokenListItemProps> = ({ token, onToggleActiveItem }) => {
  const {
    main,
    tokenId,
    logo,
    name,
    balanceAmount,
    activated
  } = token;

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
        {
          !main && (
            <Toggle
              activated={activated}
              onToggle={() => onToggleActiveItem(tokenId)}
            />
          )
        }
      </div>
    </ManageTokenListItemWrapper>
  );
};

export default ManageTokenListItem;