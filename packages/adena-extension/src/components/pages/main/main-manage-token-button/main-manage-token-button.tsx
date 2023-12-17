import React from 'react';
import { MainManageTokenButtonWrapper } from './main-manage-token-button.styles';
import MainManageTokensFilterIcon from '@assets/main-manage-tokens-filter.svg';

export interface MainManageTokenButtonProps {
  onClick: () => void;
}

const MainManageTokenButton: React.FC<MainManageTokenButtonProps> = ({ onClick }) => {
  return (
    <MainManageTokenButtonWrapper onClick={onClick}>
      <img className='icon' src={MainManageTokensFilterIcon} alt={'mange token filter icon'} />
      <span className='title'>{'Manage Tokens'}</span>
    </MainManageTokenButtonWrapper>
  );
};

export default MainManageTokenButton;