import { useCallback } from 'react';
import styled, { useTheme } from 'styled-components';

import {
  WebInput,
  WebMain,
  View,
  WebText,
  Pressable,
  WebButton,
  Row,
  WebImg,
  WebErrorText,
} from '@components/atoms';
import { TermsCheckbox } from '@components/molecules';
import { WebMainHeader } from '@components/pages/web/main-header';
import { useCreatePasswordScreen } from '@hooks/web/common/use-create-password-screen';
import { ADENA_TERMS_PAGE } from '@common/constants/resource.constant';
import useLink from '@hooks/use-link';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import IconConfirm from '@assets/web/confirm-check.svg';

const StyledContainer = styled(View)`
  width: 100%;
  height: 330px;
  row-gap: 24px;
  align-items: flex-start;
`;

const StyledMessageBox = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

const StyledInputContainer = styled(View)`
  width: 100%;
  row-gap: 16px;
`;

const StyledInputBox = styled(View)`
  width: 100%;
  row-gap: 12px;
`;

const StyledInputWrapper = styled(Row)`
  width: 100%;
  gap: 12px;
`;

const CreatePasswordScreen = (): JSX.Element => {
  const { openLink } = useLink();
  const { passwordState, confirmPasswordState, termsState, errorMessage, buttonState, onKeyDown } =
    useCreatePasswordScreen();
  const theme = useTheme();
  const { goBack, params } = useAppNavigate<RoutePath.WebCreatePassword>();

  const moveAdenaTermsPage = useCallback(() => {
    openLink(ADENA_TERMS_PAGE);
  }, [openLink]);

  return (
    <WebMain spacing={272}>
      <WebMainHeader
        stepLength={params.stepLength}
        currentStep={params.stepLength - 1}
        onClickGoBack={goBack}
      />

      <StyledContainer>
        <StyledMessageBox>
          <WebText type='headline3'>Create a password</WebText>
          <WebText type='body4' color={theme.webNeutral._500}>
            This will be used to unlock your wallet.
          </WebText>
        </StyledMessageBox>

        <StyledInputContainer>
          <StyledInputBox>
            <StyledInputWrapper>
              <WebInput
                type='password'
                name='password'
                placeholder='Password'
                style={{ width: '100%', flexShrink: 0 }}
                onChange={passwordState.onChange}
                onKeyDown={onKeyDown}
                error={passwordState.error}
                ref={passwordState.ref}
              />
              {passwordState.confirm && (<WebImg src={IconConfirm} size={20} />)}
            </StyledInputWrapper>
            {passwordState.errorMessage && <WebErrorText text={passwordState.errorMessage} />}
          </StyledInputBox>

          <StyledInputBox>
            <StyledInputWrapper>
              <WebInput
                type='password'
                name='confirmPassword'
                placeholder='Confirm Password'
                style={{ width: '100%' }}
                onChange={confirmPasswordState.onChange}
                onKeyDown={onKeyDown}
                error={confirmPasswordState.error}
              />
            </StyledInputWrapper>
            {errorMessage && <WebErrorText text={errorMessage} />}
          </StyledInputBox>
        </StyledInputContainer>

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
      </StyledContainer>
    </WebMain>
  );
};

export default CreatePasswordScreen;
