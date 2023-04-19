import React from 'react';
import { TokenListItemWrapper } from './token-list-item.styles';
import { MainToken } from '@components/common/token-list/token-list';
import TokenListItemBalance from '@components/common/token-list-item-balance/token-list-item-balance';

export interface TokenListItemProps {
  token: MainToken;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenListItem: React.FC<TokenListItemProps> = ({ token, onClickTokenItem }) => {
  const {
    tokenId,
    logo,
    name,
    balanceAmount,
  } = token;

  return (
    <TokenListItemWrapper onClick={() => onClickTokenItem(tokenId)}>
      <div className='logo-wrapper'>
        <img className='logo' src={logo} alt='token img' />
      </div>

      <div className='name-wrapper'>
        <span className='name'>{name}</span>
      </div>

      <div className='balance-wrapper'>
        <TokenListItemBalance amount={balanceAmount} />
      </div>
    </TokenListItemWrapper>
  );
};

export default TokenListItem;