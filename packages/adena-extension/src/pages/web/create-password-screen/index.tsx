import { useCallback } from 'react';
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
import { WebMainHeader } from '@components/pages/web/main-header';
import { useCreatePasswordScreen } from '@hooks/web/common/use-create-password-screen';
import { ADENA_TERMS_PAGE } from '@common/constants/resource.constant';
import useLink from '@hooks/use-link';
import useAppNavigate from '@hooks/use-app-navigate';

const StyledMessageBox = styled(View)`
  row-gap: 16px;
`;

const StyledInputBox = styled(View)`
  row-gap: 16px;
  width: 384px;
`;

const CreatePasswordScreen = (): JSX.Element => {
  const { openLink } = useLink();
  const { passwordState, confirmPasswordState, termsState, errorMessage, buttonState, onKeyDown } =
    useCreatePasswordScreen();
  const theme = useTheme();
  const { goBack } = useAppNavigate();

  const moveAdenaTermsPage = useCallback(() => {
    openLink(ADENA_TERMS_PAGE);
  }, [openLink]);

  return (
    <WebMain>
      <WebMainHeader stepLength={5} currentStep={3} onClickGoBack={goBack} />

      <StyledMessageBox>
        <WebText type='headline3'>Create a password</WebText>
        <WebText type='body4' color={theme.webNeutral._500}>
          This will be used to unlock your wallet.
        </WebText>
      </StyledMessageBox>

      <StyledInputBox>
        <WebInput
          type='password'
          name='password'
          placeholder='Password'
          onChange={passwordState.onChange}
          onKeyDown={onKeyDown}
          error={passwordState.error}
          ref={passwordState.ref}
        />
        <WebInput
          type='password'
          name='confirmPassword'
          placeholder='Confirm Password'
          onChange={confirmPasswordState.onChange}
          onKeyDown={onKeyDown}
          error={confirmPasswordState.error}
        />
        {errorMessage && <ErrorText text={errorMessage} />}
      </StyledInputBox>

      <TermsCheckbox
        checked={termsState.value}
        onChange={termsState.onChange}
        text='I agree to the&nbsp;'
        tabIndex={3}
      >
        <Pressable onClick={moveAdenaTermsPage} tabIndex={4}>
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

export default CreatePasswordScreen;
