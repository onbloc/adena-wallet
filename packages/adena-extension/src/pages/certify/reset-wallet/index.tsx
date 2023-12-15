import React from 'react';
import styled, { CSSProp } from 'styled-components';
import removeIcon from '@assets/icon-remove-blur.svg';
import Text from '@components/text';
import theme from '@styles/theme';
import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import { ButtonHierarchy } from '@components/buttons/button';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { useClear } from '@hooks/use-clear';

const content =
  'Only proceed if you wish to remove all existing accounts and replace them with new ones. Make sure to back up your seed phrase and keys first.';

const forgotPasswordContent =
  'This will remove all accounts from this wallet. As your seed phrase and keys are only stored on this device, Adena cannot recover them once reset.';

export const ResetWallet = (): JSX.Element => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { clear } = useClear();

  const cancelButtonClick = (): void => {
    return state?.backStep ? navigate(state.backStep) : navigate(-1);
  };

  const resetButtonClick = (): void => {
    clear().then(() => navigate(RoutePath.Home));
  };

  return (
    <Wrapper>
      <img src={removeIcon} alt='Reset Wallet image' />
      <Text type='header4' margin='23px 0px 12px'>
        Reset Wallet
      </Text>
      <Text type='body1Reg' color={theme.color.neutral[9]} textAlign='center'>
        {state?.from === 'forgot-password' ? forgotPasswordContent : content}
      </Text>
      <CancelAndConfirmButton
        cancelButtonProps={{ onClick: cancelButtonClick }}
        confirmButtonProps={{
          onClick: resetButtonClick,
          text: 'Reset',
          hierarchy: ButtonHierarchy.Danger,
        }}
      />
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 56px;
  overflow-y: auto;
`;
