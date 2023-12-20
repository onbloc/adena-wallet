import React from 'react';
import { TokenListWrapper } from './token-list.styles';
import TokenListItem from '../token-list-item/token-list-item';
import { MainToken } from '@types';

export interface TokenListProps {
  tokens: Array<MainToken>;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenList: React.FC<TokenListProps> = ({ tokens, onClickTokenItem }) => {
  return (
    <TokenListWrapper>
      {tokens.map((token, index) => (
        <TokenListItem key={index} token={token} onClickTokenItem={onClickTokenItem} />
      ))}
    </TokenListWrapper>
  );
};

export default TokenList;
