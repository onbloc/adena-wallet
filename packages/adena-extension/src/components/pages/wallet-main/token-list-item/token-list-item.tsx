import TokenListItemBalance from '@components/pages/wallet-main/token-list-item-balance/token-list-item-balance';
import { MainToken } from '@types';
import React from 'react';
import { TokenListItemWrapper } from './token-list-item.styles';

export interface TokenListItemProps {
  token: MainToken;
  completeImageLoading: (imageUrl: string) => void;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenListItem: React.FC<TokenListItemProps> = ({
  token,
  completeImageLoading,
  onClickTokenItem,
}) => {
  const { tokenId, logo, name, balanceAmount } = token;

  const onLoadImage = (): void => {
    completeImageLoading(logo);
  };

  return (
    <TokenListItemWrapper onClick={(): void => onClickTokenItem(tokenId)}>
      <div className='logo-wrapper'>
        <img
          className='logo'
          src={logo}
          onLoad={onLoadImage}
          onError={onLoadImage}
          loading='eager'
          decoding='sync'
          alt='token img'
        />
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
