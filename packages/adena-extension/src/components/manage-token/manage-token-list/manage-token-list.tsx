import React from 'react';
import { ManageTokenListWrapper } from './manage-token-list.styles';
import ManageTokenListItem from '@components/manage-token/manage-token-list-item/manage-token-list-item';

export interface ManageToken {
  tokenId: string;
  logo: string;
  name: string;
  activated: boolean;
  main?: boolean;
  balanceAmount: {
    value: string;
    denom: string;
  }
}

export interface ManageTokenListProps {
  tokens: Array<ManageToken>
  onToggleActiveItem: (tokenId: string) => void;
}

const ManageTokenList: React.FC<ManageTokenListProps> = ({ tokens, onToggleActiveItem }) => {
  return (
    <ManageTokenListWrapper>
      {tokens.map((token, index) => <ManageTokenListItem
        key={index}
        token={token}
        onToggleActiveItem={onToggleActiveItem}
      />
      )}
    </ManageTokenListWrapper>
  );
};

export default ManageTokenList;