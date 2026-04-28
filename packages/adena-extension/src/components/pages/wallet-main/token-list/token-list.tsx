import { MainToken } from '@types';
import React from 'react';
import TokenListItem from '../token-list-item/token-list-item';
import TokenListItemPlaceholder from '../token-list-item-placeholder/token-list-item-placeholder';
import { TokenListWrapper } from './token-list.styles';

export interface TokenListItemState {
  loading?: boolean;
  error?: boolean;
}

export interface TokenListProps {
  tokens: Array<MainToken>;
  itemStateByTokenId?: Record<string, TokenListItemState>;
  placeholderCount?: number;
  completeImageLoading: (imageUrl: string) => void;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenList: React.FC<TokenListProps> = ({
  tokens,
  itemStateByTokenId,
  placeholderCount = 0,
  completeImageLoading,
  onClickTokenItem,
}) => {
  if (tokens.length === 0 && placeholderCount > 0) {
    return (
      <TokenListWrapper>
        {Array.from({ length: placeholderCount }).map((_, index) => (
          <TokenListItemPlaceholder key={`placeholder-${index}`} />
        ))}
      </TokenListWrapper>
    );
  }

  return (
    <TokenListWrapper>
      {tokens.map((token, index) => {
        const state = itemStateByTokenId?.[token.tokenId];
        return (
          <TokenListItem
            key={index}
            token={token}
            loading={state?.loading}
            error={state?.error}
            completeImageLoading={completeImageLoading}
            onClickTokenItem={onClickTokenItem}
          />
        );
      })}
    </TokenListWrapper>
  );
};

export default TokenList;
