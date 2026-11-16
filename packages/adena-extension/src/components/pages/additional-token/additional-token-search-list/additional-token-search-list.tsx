import React, { useCallback, useMemo } from 'react';
import {
  AdditionalTokenSearchListItemWrapper,
  AdditionalTokenSearchListWrapper,
} from './additional-token-search-list.styles';
import { TokenInfo } from '@types';
import { makeDisplayPackagePath } from '@common/utils/string-utils';

export interface AdditionalTokenSearchListProps {
  tokenInfos: TokenInfo[];
  onClickListItem: (tokenId: string) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
}

// Distance from the bottom (px) at which the next page is requested.
const LOAD_MORE_THRESHOLD = 48;

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

  const formattedPath = useMemo(() => {
    return makeDisplayPackagePath(path || '');
  }, [path]);

  return (
    <AdditionalTokenSearchListItemWrapper onClick={(): void => onClickListItem(tokenId)}>
      <span className='title'>
        <span className='name'>{name}</span>
        <span className='symbol'>{`(${formattedSymbol})`}</span>
      </span>
      <span className='path'>{formattedPath}</span>
    </AdditionalTokenSearchListItemWrapper>
  );
};

const AdditionalTokenSearchList: React.FC<AdditionalTokenSearchListProps> = ({
  tokenInfos,
  onClickListItem,
  onEndReached,
  hasMore,
  loadingMore,
}) => {
  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      if (!onEndReached || !hasMore || loadingMore) {
        return;
      }
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      if (scrollHeight - scrollTop - clientHeight <= LOAD_MORE_THRESHOLD) {
        onEndReached();
      }
    },
    [onEndReached, hasMore, loadingMore],
  );

  return (
    <AdditionalTokenSearchListWrapper>
      <div className='scroll-wrapper' onScroll={handleScroll}>
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
