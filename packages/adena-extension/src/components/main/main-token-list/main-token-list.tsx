import React from 'react';
import { MainTokenListWrapper } from './main-token-list.styles';
import MainTokenListItem from '../main-token-list-item/main-token-list-item';

export interface MainToken {
  tokenId: string;
  logo: string;
  name: string;
  balanceAmount: {
    value: string;
    denom: string;
  }
}

export interface MainTokenListProps {
  tokens: Array<MainToken>
  onClickTokenItem: (tokenId: string) => void;
}

const MainTokenList: React.FC<MainTokenListProps> = ({ tokens, onClickTokenItem }) => {
  return (
    <MainTokenListWrapper>
      {tokens.map((token, index) => <MainTokenListItem key={index} token={token} onClickTokenItem={onClickTokenItem} />)}
    </MainTokenListWrapper>
  );
};

export default MainTokenList;