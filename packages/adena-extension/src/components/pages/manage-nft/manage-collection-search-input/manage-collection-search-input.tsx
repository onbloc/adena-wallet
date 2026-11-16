import ManageTokenSearchIcon from '@assets/manage-token-search.svg';
import React from 'react';
import { ManageCollectionSearchInputWrapper } from './manage-collection-search-input.styles';

export interface ManageCollectionSearchInputProps {
  keyword: string;
  onChangeKeyword: (keyword: string) => void;
}

const ManageCollectionSearchInput: React.FC<ManageCollectionSearchInputProps> = ({
  keyword,
  onChangeKeyword,
}) => {
  return (
    <ManageCollectionSearchInputWrapper>
      <div className='search-icon-wrapper'>
        <img className='search' src={ManageTokenSearchIcon} alt='search icon' />
      </div>

      <div className='input-wrapper'>
        <input
          className='search-input'
          value={keyword}
          onChange={(event): void => onChangeKeyword(event.target.value)}
          placeholder='Search'
        />
      </div>
    </ManageCollectionSearchInputWrapper>
  );
};

export default ManageCollectionSearchInput;
