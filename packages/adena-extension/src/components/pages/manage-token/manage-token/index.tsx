import React from 'react';
import { ManageTokenSearchWrapper } from './manage-token.styles';
import { ManageTokenInfo } from '@types';
import ManageTokenList from '../manage-token-list/manage-token-list';
import ManageTokenSearchInput from '../manage-token-search-input/manage-token-search-input';

export interface ManageTokenSearchProps {
  keyword: string;
  tokens: ManageTokenInfo[];
  onClickAdded: () => void;
  onClickClose: () => void;
  onChangeKeyword: (keyword: string) => void;
  onToggleActiveItem: (tokenId: string, activated: boolean) => void;
}

const ManageTokenSearch: React.FC<ManageTokenSearchProps> = ({
  keyword,
  tokens,
  onClickClose,
  onClickAdded,
  onChangeKeyword,
  onToggleActiveItem,
}) => {
  return (
    <ManageTokenSearchWrapper>
      <div className='content-wrapper'>
        <div className='input-wrapper'>
          <ManageTokenSearchInput
            keyword={keyword}
            onClickAdded={onClickAdded}
            onChangeKeyword={onChangeKeyword}
          />
        </div>
        <div className='list-wrapper'>
          <ManageTokenList tokens={tokens} onToggleActiveItem={onToggleActiveItem} />
        </div>
      </div>
      <div className='close-wrapper'>
        <button className='close' onClick={onClickClose}>
          Close
        </button>
      </div>
    </ManageTokenSearchWrapper>
  );
};

export default ManageTokenSearch;
