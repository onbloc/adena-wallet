import React, { useMemo } from 'react';
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
  selectedInfo,
  onChangeKeyword,
  onClickOpenButton,
  onClickListItem,
}) => {
  const selectedTokenName = useMemo(() => {
    const name = selectedInfo?.name;
    if (!selected || !name) {
      return '';
    }
    return name;
  }, [selected, selectedInfo]);

  const selectedTokenSymbol = useMemo(() => {
    const symbol = selectedInfo?.symbol;
    if (!selected || !symbol) {
      return '';
    }
    if (symbol.length > 5) {
      return `(${symbol.slice(0, 5)}...)`;
    }
    return `(${symbol})`;
  }, [selected, selectedInfo]);

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
          {selected ? (
            <span className='title'>
              <span className='name'>{selectedTokenName}</span>
              <span className='symbol'>{selectedTokenSymbol}</span>
            </span>
          ) : (
            <span className='title'>Select a GRC20 Token</span>
          )}

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
