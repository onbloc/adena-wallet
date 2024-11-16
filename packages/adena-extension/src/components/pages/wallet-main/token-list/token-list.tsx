import { MainToken } from '@types';
import React from 'react';
import TokenListItem from '../token-list-item/token-list-item';
import { TokenListWrapper } from './token-list.styles';

export interface TokenListProps {
  tokens: Array<MainToken>;
  completeImageLoading: (imageUrl: string) => void;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenList: React.FC<TokenListProps> = ({
  tokens,
  completeImageLoading,
  onClickTokenItem,
}) => {
  return (
    <TokenListWrapper>
      {tokens.map((token, index) => (
        <TokenListItem
          key={index}
          token={token}
          completeImageLoading={completeImageLoading}
          onClickTokenItem={onClickTokenItem}
        />
      ))}
    </TokenListWrapper>
  );
};

export default TokenList;
