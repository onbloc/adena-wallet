import React, { useMemo } from 'react';
import {
  AdditionalTokenSearchListItemWrapper,
  AdditionalTokenSearchListWrapper,
} from './additional-token-search-list.styles';
import { TokenInfo } from '@types';

export interface AdditionalTokenSearchListProps {
  tokenInfos: TokenInfo[];
  onClickListItem: (tokenId: string) => void;
}

interface AdditionalTokenSearchListItem {
  tokenId: string;
  name: string;
  symbol: string;
  path: string;
  onClickListItem: (tokenId: string) => void;
}

const AdditionalTokenSearchListItem: React.FC<AdditionalTokenSearchListItem> = ({
  tokenId,
  name,
  symbol,
  path,
  onClickListItem,
}) => {
  const formattedSymbol = useMemo(() => {
    const SYMBOL_TEXT_LENGTH = 5;
    if (symbol.length > SYMBOL_TEXT_LENGTH) {
      return `${symbol.substring(0, SYMBOL_TEXT_LENGTH)}...`;
    }
    return symbol;
  }, [symbol]);

  return (
    <AdditionalTokenSearchListItemWrapper onClick={(): void => onClickListItem(tokenId)}>
      <span className='title'>
        <span className='name'>{name}</span>
        <span className='symbol'>{`(${formattedSymbol})`}</span>
      </span>
      <span className='path'>{path}</span>
    </AdditionalTokenSearchListItemWrapper>
  );
};

const AdditionalTokenSearchList: React.FC<AdditionalTokenSearchListProps> = ({
  tokenInfos,
  onClickListItem,
}) => {
  return (
    <AdditionalTokenSearchListWrapper>
      <div className='scroll-wrapper'>
        {tokenInfos.length === 0 ? (
          <span className='no-content'>No Tokens to Search</span>
        ) : (
          tokenInfos.map((tokenInfo, index) => (
            <AdditionalTokenSearchListItem
              key={index}
              tokenId={tokenInfo.tokenId}
              symbol={tokenInfo.symbol}
              name={tokenInfo.name}
              path={tokenInfo.pathInfo}
              onClickListItem={onClickListItem}
            />
          ))
        )}
      </div>
    </AdditionalTokenSearchListWrapper>
  );
};

export default AdditionalTokenSearchList;
