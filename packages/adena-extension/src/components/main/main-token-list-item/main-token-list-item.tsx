import React from 'react';
import { MainTokenListItemWrapper } from './main-token-list-item.styles';
import { MainToken } from '@components/main/main-token-list/main-token-list';
// import MainTokenListItemBalance from '@components/main/main-token-list-item-balance/main-token-list-item-balance';

export interface MainTokenListItemProps {
  token: MainToken;
  onClickTokenItem: (tokenId: string) => void;
}

const MainTokenListItem: React.FC<MainTokenListItemProps> = ({ token, onClickTokenItem }) => {
  const {
    tokenId,
    logo,
    name,
    balanceAmount,
  } = token;

  return (
    <MainTokenListItemWrapper onClick={() => onClickTokenItem(tokenId)}>
      <div className='logo-wrapper'>
        <img className='logo' src={logo} alt='token img' />
      </div>

      <div className='name-wrapper'>
        <span className='name'>{name}</span>
      </div>

      <div className='balance-wrapper'>
        {/* <MainTokenListItemBalance amount={balanceAmount} /> */}
      </div>
    </MainTokenListItemWrapper>
  );
};

export default MainTokenListItem;