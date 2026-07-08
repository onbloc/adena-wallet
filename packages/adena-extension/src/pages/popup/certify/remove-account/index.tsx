import React from 'react';
import styled, { useTheme } from 'styled-components';
import { useRecoilState } from 'recoil';

import removeIcon from '@assets/icon-remove-blur.svg';
import { Text } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import { useClear } from '@hooks/use-clear';
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
  const { availRemoveAccount, removeAccount } = useRemoveAccount();
  const { clear } = useClear();
  const [, setState] = useRecoilState(WalletState.state);

  const removeButtonClick = async (): Promise<void> => {
    if (!currentAccount) {
      return;
    }
    setState('LOADING');

    // Removing the only account leaves no wallet to return to, so the wallet is
    // reset instead. This is the exit path for a revoked session account that
    // was imported on its own.
    if (!(await availRemoveAccount())) {
      await clear();
      navigate(RoutePath.Home);
      return;
    }

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
