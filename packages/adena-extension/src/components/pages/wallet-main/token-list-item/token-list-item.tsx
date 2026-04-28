import AssetIcon from '@components/atoms/asset-icon/asset-icon';
import TokenListItemBalance from '@components/pages/wallet-main/token-list-item-balance/token-list-item-balance';
import { MainToken } from '@types';
import React from 'react';
import { TokenListItemWrapper } from './token-list-item.styles';

export interface TokenListItemProps {
  token: MainToken;
  loading?: boolean;
  error?: boolean;
  completeImageLoading: (imageUrl: string) => void;
  onClickTokenItem: (tokenId: string) => void;
}

const TokenListItem: React.FC<TokenListItemProps> = ({
  token,
  loading = false,
  error = false,
  completeImageLoading,
  onClickTokenItem,
}) => {
  const { tokenId, logo, name, balanceAmount, chainIconUrl } = token;

  const onLoadImage = (): void => {
    completeImageLoading(logo);
  };

  // Block navigation into token-details when the row's network is unreachable
  // — there is no balance/history to show, and entering would just stack
  // another empty/error screen.
  const handleClick = (): void => {
    if (error) return;
    onClickTokenItem(tokenId);
  };

  return (
    <TokenListItemWrapper $disabled={error} onClick={handleClick}>
      <div className='logo-wrapper'>
        <AssetIcon
          tokenIconUrl={logo}
          chainIconUrl={chainIconUrl}
          onLoad={onLoadImage}
          onError={onLoadImage}
        />
      </div>

      <div className='name-wrapper'>
        <span className='name'>{name}</span>
      </div>

      <div className='balance-wrapper'>
        <TokenListItemBalance amount={balanceAmount} loading={loading} error={error} />
      </div>
    </TokenListItemWrapper>
  );
};

export default TokenListItem;
