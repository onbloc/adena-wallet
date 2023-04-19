import React from 'react';
import { ManageTokenSearchInputWrapper } from './manage-token-search-input.styles';
import ManageTokenSearchIcon from '@assets/manage-token-search.svg';
import ManageTokenAddedIcon from '@assets/manage-token-added.svg';

export interface ManageTokenSearchInputProps {
  keyword: string;
  onChangeKeyword: (keyword: string) => void;
  onClickAdded: () => void;
}

const ManageTokenSearchInput: React.FC<ManageTokenSearchInputProps> = ({
  keyword,
  onChangeKeyword,
  onClickAdded,
}) => {
  return (
    <ManageTokenSearchInputWrapper>
      <div className='search-icon-wrapper'>
        <img
          className='search'
          src={ManageTokenSearchIcon}
          alt='search icon'
        />
      </div>

      <div className='input-wrapper'>
        <input
          className='search-input'
          value={keyword}
          onChange={event => onChangeKeyword(event.target.value)}
          placeholder='Search'
        />
      </div>

      <div className='added-icon-wrapper' onClick={onClickAdded}>
        <img
          className='added'
          src={ManageTokenAddedIcon}
          alt='search icon'
        />
      </div>
    </ManageTokenSearchInputWrapper>
  );
};

export default ManageTokenSearchInput;