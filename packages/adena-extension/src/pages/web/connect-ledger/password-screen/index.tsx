import styled, { useTheme } from 'styled-components';

import {
  WebInput,
  ErrorText,
  WebMain,
  View,
  WebText,
  Pressable,
  WebButton,
} from '@components/atoms';
import { TermsCheckbox } from '@components/molecules';

import { useLedgerPasswordScreen } from '@hooks/web/connect-ledger/use-ledger-password-screen';
import useLink from '@hooks/use-link';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledInputBox = styled(View)`
  row-gap: 16px;
  width: 384px;
`;

const ConnectLedgerPassword = (): JSX.Element => {
  const { openLink } = useLink();
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, onKeyDown } =
    useLedgerPasswordScreen();
  const handleLinkClick = (): void => openLink('https://adena.app/terms');
  const theme = useTheme();
  const { navigate } = useAppNavigate();

  return (
    <WebMain>
      <WebMainHeader
        stepLength={5}
        onClickGoBack={(): void => {
          navigate(RoutePath.WebConnectLedger);
        }}
        currentStep={4}
      />
      <StyledMessageBox>
        <WebText type='headline3'>Create a password</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          This will be used to unlock your wallet.
        </WebText>
      </StyledMessageBox>

      <StyledInputBox>
        <WebInput
          type='password'
          name='pwd'
          placeholder='Password'
          onChange={pwdState.onChange}
          onKeyDown={onKeyDown}
          error={pwdState.error}
          ref={pwdState.ref}
        />
        <WebInput
          type='password'
          name='confirmPwd'
          placeholder='Confirm Password'
          onChange={confirmPwdState.onChange}
          onKeyDown={onKeyDown}
          error={confirmPwdState.error}
        />
        {errorMessage && <ErrorText text={errorMessage} />}
      </StyledInputBox>
      <TermsCheckbox
        checked={termsState.value}
        onChange={termsState.onChange}
        text='I agree to the&nbsp;'
        tabIndex={3}
      >
        <Pressable onClick={handleLinkClick} tabIndex={4}>
          Terms of Use.
        </Pressable>
      </TermsCheckbox>
      <WebButton
        figure='primary'
        size='small'
        disabled={buttonState.disabled}
        onClick={buttonState.onClick}
        tabIndex={5}
        text='Save'
        rightIcon='chevronRight'
      />
    </WebMain>
  );
};

export default ConnectLedgerPassword;
