import MainManageTokensFilterIcon from '@assets/main-manage-tokens-filter.svg';
import React from 'react';
import { MainManageTokenButtonWrapper } from './main-manage-token-button.styles';

export interface MainManageTokenButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

const MainManageTokenButton: React.FC<MainManageTokenButtonProps> = ({
  onClick,
  disabled = false,
}) => {
  return (
    <MainManageTokenButtonWrapper type='button' onClick={onClick} disabled={disabled}>
      <img className='icon' src={MainManageTokensFilterIcon} alt={'mange token filter icon'} />
      <span className='title'>{'Manage Tokens'}</span>
    </MainManageTokenButtonWrapper>
  );
};

export default MainManageTokenButton;
