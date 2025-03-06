import styled, { css, CSSProp } from 'styled-components';

import { Button, DefaultInput, ErrorText, Text, View } from '@components/atoms';
import { PasswordInput } from '@components/atoms/password-input';
import { TermsCheckbox, TitleWithDesc } from '@components/molecules';
import { useCreatePassword } from '@hooks/certify/use-create-password';
import useAppNavigate from '@hooks/use-app-navigate';
import useLink from '@hooks/use-link';
import mixins from '@styles/mixins';
import { RoutePath } from '@types';

const text = {
  title: 'Create\na Password',
  desc: 'This will be used to unlock your wallet.',
};

const popupStyle = css`
  ${mixins.flex({ justify: 'flex-start' })};
  max-width: 380px;
  min-height: 514px;
  padding-top: 50px;
`;

const defaultStyle = css`
  ${mixins.flex({ justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

const Wrapper = styled.main<{ isPopup: boolean }>`
  ${({ isPopup }): CSSProp => (isPopup ? popupStyle : defaultStyle)};
  height: 100%;
  justify-content: space-between;
`;

const StyledContentWrapper = styled(View)`
  width: 100%;
  height: 100%;
`;

const StyledBottomWrapper = styled(View)`
  width: 100%;
`;

const FormBox = styled.div`
  margin-top: 20px;
  & > * {
    margin-bottom: 12px;
  }
`;

export const CreatePassword = (): JSX.Element => {
  const { openLink } = useLink();
  const { pwdState, confirmPwdState, termsState, errorMessage, buttonState, onKeyDown } =
    useCreatePassword();
  const { params } = useAppNavigate<RoutePath.CreatePassword>();
  const handleLinkClick = (): void => openLink('https://adena.app/terms');

  return (
    <Wrapper isPopup={params.type !== 'SEED'}>
      <StyledContentWrapper>
        <TitleWithDesc title={text.title} desc={text.desc} />
        <FormBox>
          <PasswordInput
            type='password'
            name='pwd'
            placeholder='Password'
            evaluationResult={pwdState.evaluationResult}
            value={pwdState.value}
            onChange={pwdState.onChange}
            onKeyDown={onKeyDown}
            error={pwdState.error}
            ref={pwdState.ref}
          />
          <DefaultInput
            type='password'
            name='confirmPwd'
            placeholder='Confirm Password'
            value={confirmPwdState.value}
            onChange={confirmPwdState.onChange}
            onKeyDown={onKeyDown}
            error={confirmPwdState.error}
          />
          {errorMessage && <ErrorText text={errorMessage} />}
        </FormBox>
      </StyledContentWrapper>

      <StyledBottomWrapper>
        <TermsCheckbox
          checked={termsState.value}
          onChange={termsState.onChange}
          text='I agree to the&nbsp;'
          tabIndex={3}
        >
          <button className='terms-button' type='button' onClick={handleLinkClick} tabIndex={4}>
            Terms of Use.
          </button>
        </TermsCheckbox>
        <Button
          fullWidth
          disabled={buttonState.disabled}
          onClick={buttonState.onClick}
          tabIndex={5}
        >
          <Text type='body1Bold'>Save</Text>
        </Button>
      </StyledBottomWrapper>
    </Wrapper>
  );
};
