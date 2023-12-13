import React from 'react';
import { ManageTokenListWrapper } from './manage-token-list.styles';
import ManageTokenListItem from '@components/manage-token/manage-token-list-item/manage-token-list-item';
import { ManageTokenInfo } from '@types';

export interface ManageTokenListProps {
  tokens: Array<ManageTokenInfo>;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

const ManageTokenList: React.FC<ManageTokenListProps> = ({ tokens, onToggleActiveItem }) => {
  return (
    <ManageTokenListWrapper>
      {tokens.map((token, index) => (
        <ManageTokenListItem key={index} token={token} onToggleActiveItem={onToggleActiveItem} />
      ))}
    </ManageTokenListWrapper>
  );
};

export default ManageTokenList;
