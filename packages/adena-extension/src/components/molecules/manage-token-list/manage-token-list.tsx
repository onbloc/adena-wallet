import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import React from 'react';
import ManageTokenListItem from './manage-token-list-item';
import { ManageTokenListWrapper } from './manage-token-list.styles';

export interface ManageTokenInfo {
  tokenId: string;
  type: 'token';
  logo: string;
  name: string;
  display?: boolean;
  main?: boolean;
  balance: {
    value: string;
    denom: string;
  };
}

export interface ManageGRC721Info {
  tokenId: string;
  type: 'grc721';
  packagePath: string;
  isTokenUri: boolean;
  name: string;
  display?: boolean;
}

export interface ManageTokenListProps {
  tokens: ManageTokenInfo[] | ManageGRC721Info[];
  queryGRC721TokenUri?: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  queryGRC721Balance?: (
    packagePath: string,
    options?: UseQueryOptions<number | null, Error>,
  ) => UseQueryResult<number | null>;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

const ManageTokenList: React.FC<ManageTokenListProps> = ({
  tokens,
  queryGRC721TokenUri,
  queryGRC721Balance,
  onToggleActiveItem,
}) => {
  return (
    <ManageTokenListWrapper>
      {tokens.map((token, index) => (
        <ManageTokenListItem
          key={index}
          token={token}
          onToggleActiveItem={onToggleActiveItem}
          queryGRC721TokenUri={queryGRC721TokenUri}
          queryGRC721Balance={queryGRC721Balance}
        />
      ))}
    </ManageTokenListWrapper>
  );
};

export default ManageTokenList;
