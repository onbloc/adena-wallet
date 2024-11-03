import ManageTokenList from '@components/molecules/manage-token-list/manage-token-list';
import { UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { ManageGRC721Info } from '@types';
import React from 'react';
import ManageCollectionSearchInput from '../manage-collection-search-input/manage-collection-search-input';
import { ManageCollectionsWrapper } from './manage-collections.styles';

export interface ManageCollectionsProps {
  keyword: string;
  collections: ManageGRC721Info[];
  onClickClose: () => void;
  queryGRC721TokenUri: (
    packagePath: string,
    tokenId: string,
    options?: UseQueryOptions<string | null, Error>,
  ) => UseQueryResult<string | null>;
  queryGRC721Balance: (
    packagePath: string,
    options?: UseQueryOptions<number | null, Error>,
  ) => UseQueryResult<number | null>;
  onChangeKeyword: (keyword: string) => void;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

const ManageCollections: React.FC<ManageCollectionsProps> = ({
  keyword,
  collections,
  queryGRC721TokenUri,
  queryGRC721Balance,
  onClickClose,
  onChangeKeyword,
  onToggleActiveItem,
}) => {
  return (
    <ManageCollectionsWrapper>
      <div className='content-wrapper'>
        <div className='input-wrapper'>
          <ManageCollectionSearchInput keyword={keyword} onChangeKeyword={onChangeKeyword} />
        </div>
        <div className='list-wrapper'>
          <ManageTokenList
            tokens={collections}
            queryGRC721TokenUri={queryGRC721TokenUri}
            queryGRC721Balance={queryGRC721Balance}
            onToggleActiveItem={onToggleActiveItem}
          />
        </div>
      </div>
      <div className='close-wrapper'>
        <button className='close' onClick={onClickClose}>
          Close
        </button>
      </div>
    </ManageCollectionsWrapper>
  );
};

export default ManageCollections;
