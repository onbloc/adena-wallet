import React from 'react';
import { AdditionalTokenWrapper } from './additional-token.styles';
import AdditionalTokenSelectBox from '@components/manage-token/additional-token-select-box/additional-token-select-box';
import AdditionalTokenInfo from '@components/manage-token/additional-token-info/additional-token-info';

export interface TokenInfo {
  tokenId: string;
  title: string;
  description: string;
}

export interface AdditionalTokenProps {
  opened: boolean;
  selected: boolean;
  keyword: string;
  tokenInfos: TokenInfo[];
  selectedTokenInfo: {
    title: string;
    symbol: string;
    path: string;
    decimals: string;
  }
  onChangeKeyword: (keyword: string) => void;
  onClickOpenButton: (opened: boolean) => void;
  onClickListItem: (tokenId: string) => void;
  onClickCancel: () => void;
  onClickAdd: () => void;
}

const AdditionalToken: React.FC<AdditionalTokenProps> = ({
  opened,
  selected,
  keyword,
  tokenInfos,
  selectedTokenInfo,
  onChangeKeyword,
  onClickOpenButton,
  onClickListItem,
  onClickCancel,
  onClickAdd,
}) => {
  return (
    <AdditionalTokenWrapper>
      <div className='select-box-wrapper'>
        <AdditionalTokenSelectBox
          opened={opened}
          selected={selected}
          keyword={keyword}
          tokenInfos={tokenInfos}
          selectedTitle={selectedTokenInfo.title}
          onChangeKeyword={onChangeKeyword}
          onClickOpenButton={onClickOpenButton}
          onClickListItem={onClickListItem}
        />
      </div>
      <div className='info-wrapper'>
        <AdditionalTokenInfo
          symbol={selectedTokenInfo.symbol}
          path={selectedTokenInfo.path}
          decimals={selectedTokenInfo.decimals}
        />
      </div>
      <div className='button-wrapper'>
        <button className='cancel-button' onClick={onClickCancel}>Cancel</button>
        <button className={selected ? 'add-button' : 'add-button disabled'} onClick={onClickAdd}>Add</button>
      </div>
    </AdditionalTokenWrapper>
  );
};

export default AdditionalToken;