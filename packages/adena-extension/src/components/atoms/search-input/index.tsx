import React from 'react';
import SearchIcon from '@assets/common-search.svg';
import { SearchInputWrapper } from './search-input.styles';

interface AdditionalButtonOption {
  button: React.ReactNode;
  onClickButton: () => void;
}

export interface SearchInputProps {
  keyword: string;
  onChangeKeyword: (keyword: string) => void;
  option?: AdditionalButtonOption;
}

export const SearchInput: React.FC<SearchInputProps> = ({ keyword, onChangeKeyword, option }) => {
  return (
    <SearchInputWrapper>
      <div className='search-icon-wrapper'>
        <img className='search' src={SearchIcon} alt='search icon' />
      </div>

      <div className='input-wrapper'>
        <input
          className='search-input'
          value={keyword}
          onChange={(event): void => onChangeKeyword(event.target.value)}
          placeholder='Search'
        />
      </div>

      {option && (
        <div className='added-icon-wrapper' onClick={(): void => option.onClickButton()}>
          {option.button}
        </div>
      )}
    </SearchInputWrapper>
  );
};
