import React from 'react';
import styled, { useTheme } from 'styled-components';
import { useRecoilState } from 'recoil';

import removeIcon from '@assets/icon-remove-blur.svg';
import { Text } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import { useRemoveAccount } from '@hooks/use-remove-account';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@types';
import { WalletState } from '@states';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const content =
  'Only proceed if you wish to remove this account from your wallet. You can always recover it with your seed phrase or your private key.';

export const RemoveAccount = (): JSX.Element => {
  const theme = useTheme();
  const { navigate, goBack } = useAppNavigate();
  const { currentAccount } = useCurrentAccount();
  const { removeAccount } = useRemoveAccount();
  const [, setState] = useRecoilState(WalletState.state);

  const removeButtonClick = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    setState('LOADING');
    await removeAccount(currentAccount);
    navigate(RoutePath.Wallet);
  };

  return (
    <Wrapper>
      <img src={removeIcon} alt='Remove Account image' />
      <Text type='header4' margin='23px 0px 12px'>
        Remove Account
      </Text>
      <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
        {content}
      </Text>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: goBack }}
        confirmButtonProps={{
          onClick: removeButtonClick,
          text: 'Remove',
          hierarchy: 'danger',
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 56px;
  overflow-y: auto;
`;
