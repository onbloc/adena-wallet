import React from 'react';
import styled from 'styled-components';
import removeIcon from '@assets/icon-remove-blur.svg';
import Text from '@components/text';
import theme from '@styles/theme';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { ButtonHierarchy } from '@components/buttons/button';
import { useNavigate } from 'react-router-dom';
import { useRemoveAccount } from '@hooks/use-remove-account';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@router/path';
import { useRecoilState } from 'recoil';
import { WalletState } from '@states/index';

const content =
  'Only proceed if you wish to remove this account from your wallet. You can always recover it with your seed phrase or your private key.';

export const RemoveAccount = () => {
  const navigate = useNavigate();
  const { currentAccount } = useCurrentAccount();
  const { removeAccount } = useRemoveAccount();
  const [, setState] = useRecoilState(WalletState.state);

  const cancelButtonClick = () => {
    navigate(-1);
  };

  const removeButtonClick = async () => {
    if (!currentAccount) {
      return;
    }
    setState("LOADING");
    await removeAccount(currentAccount);
    navigate(RoutePath.Home);
  };

  return (
    <Wrapper>
      <img src={removeIcon} alt='Remove Account image' />
      <Text type='header4' margin='23px 0px 12px'>
        Remove Account
      </Text>
      <Text type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
        {content}
      </Text>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: cancelButtonClick }}
        confirmButtonProps={{
          onClick: removeButtonClick,
          text: 'Remove',
          hierarchy: ButtonHierarchy.Danger,
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 56px;
  overflow-y: auto;
`;
