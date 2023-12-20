import React from 'react';
import { AdditionalTokenSelectBoxWrapper } from './additional-token-select-box.styles';
import AdditionalTokenSearchList from '@components/pages/additional-token/additional-token-search-list/additional-token-search-list';
import ArrowUpIcon from '@assets/common-arrow-up-gray.svg';
import ArrowDownIcon from '@assets/common-arrow-down-gray.svg';
import { SearchInput } from '@components/atoms';
import { AdditionalTokenSelectBoxProps } from '@types';

const AdditionalTokenSelectBox: React.FC<AdditionalTokenSelectBoxProps> = ({
  opened,
  keyword,
  tokenInfos,
  selected,
  selectedTitle,
  onChangeKeyword,
  onClickOpenButton,
  onClickListItem,
}) => {
  return (
    <AdditionalTokenSelectBoxWrapper>
      <div
        className={opened ? 'fixed-wrapper opened' : 'fixed-wrapper'}
        onClick={(e): void => e.stopPropagation()}
      >
        <div
          className={selected ? 'select-box selected' : 'select-box'}
          onClick={(): void => onClickOpenButton(!opened)}
        >
          <span className='title'>{selected ? selectedTitle : 'Select a GRC20 Token'}</span>
          <span className='icon-wrapper'>
            {opened ? (
              <img src={`${ArrowUpIcon}`} alt='select box opened icon' />
            ) : (
              <img src={`${ArrowDownIcon}`} alt='select box unopened icon' />
            )}
          </span>
        </div>
        {opened && (
          <div className='list-wrapper'>
            <div className='search-input-wrapper'>
              <SearchInput keyword={keyword} onChangeKeyword={onChangeKeyword} />
            </div>
            <AdditionalTokenSearchList tokenInfos={tokenInfos} onClickListItem={onClickListItem} />
          </div>
        )}
      </div>
    </AdditionalTokenSelectBoxWrapper>
  );
};

export default AdditionalTokenSelectBox;
