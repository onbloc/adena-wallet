import React from 'react';
import styled, { useTheme } from 'styled-components';

import removeIcon from '@assets/icon-remove-blur.svg';
import { Text } from '@components/atoms';
import { CancelAndConfirmButton } from '@components/molecules';
import { RoutePath } from '@types';
import { useClear } from '@hooks/use-clear';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const content =
  'Only proceed if you wish to remove all existing accounts and replace them with new ones. Make sure to back up your seed phrase and keys first.';

const forgotPasswordContent =
  'This will remove all accounts from this wallet. As your seed phrase and keys are only stored on this device, Adena cannot recover them once reset.';

export const ResetWallet = (): JSX.Element => {
  const theme = useTheme();
  const { navigate, goBack, params } = useAppNavigate<RoutePath.ResetWallet>();
  const { clear } = useClear();

  const resetButtonClick = (): void => {
    clear().then(() => navigate(RoutePath.Home));
  };

  return (
    <Wrapper>
      <img src={removeIcon} alt='Reset Wallet image' />
      <Text type='header4' margin='23px 0px 12px'>
        Reset Wallet
      </Text>
      <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
        {params?.from === 'forgot-password' ? forgotPasswordContent : content}
      </Text>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: goBack }}
        confirmButtonProps={{
          onClick: resetButtonClick,
          text: 'Reset',
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
