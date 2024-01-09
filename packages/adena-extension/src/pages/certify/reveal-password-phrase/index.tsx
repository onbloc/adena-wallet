import React, { useState } from 'react';
import styled from 'styled-components';

import { Text, WarningBox, DefaultInput, ErrorText } from '@components/atoms';
import { TermsCheckbox, CancelAndConfirmButton } from '@components/molecules';
import { RoutePath } from '@router/path';
import { useAdenaContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

const TermsAText = 'Anyone with the phrase will have full control over my funds.';
const TermsBText = 'I will never share my seed phrase with anyone.';

export const RevealPasswordPhrase = (): JSX.Element => {
  const { walletService } = useAdenaContext();
  const { navigate, goBack } = useAppNavigate();
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [termsA, setTermsA] = useState(false);
  const [termsB, setTermsB] = useState(false);
  const disabled = termsA && termsB && pwd;
  const [clicked, setClicked] = useState(false);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setPwd(e.target.value);
    setError(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && termsA && termsB && pwd) {
      confirmButtonClick();
    }
  };

  const termsAChange = (): void => {
    setTermsA((prev: boolean) => !prev);
  };

  const termsBChange = (): void => {
    setTermsB((prev: boolean) => !prev);
  };

  const confirmButtonClick = async (): Promise<void> => {
    if (clicked) {
      return;
    }
    if (!termsA) {
      return;
    }
    if (!termsB) {
      return;
    }
    setClicked(true);

    const equalPassword = await walletService.equalsPassword(pwd);
    if (!equalPassword) {
      setErrorMessage('Invalid Password');
      setError(true);
      setClicked(false);
      return;
    }
    navigate(RoutePath.RevealPrivatePhrase, { replace: true });
    setClicked(false);
  };

  return (
    <Wrapper>
      <Text type='header4'>Reveal Seed Phrase</Text>
      <WarningBox type='revealPassword' margin='12px 0px 20px' />
      <DefaultInput
        type='password'
        placeholder='Password'
        value={pwd}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
      />
      {error && <ErrorText text={errorMessage} />}
      <TermsWrap>
        <TermsCheckbox
          checked={termsA}
          onChange={termsAChange}
          tabIndex={2}
          id='terms-A'
          text={TermsAText}
          checkboxPos='TOP'
          className='terms-A'
        />
        <TermsCheckbox
          checked={termsB}
          onChange={termsBChange}
          tabIndex={3}
          id='terms-B'
          text={TermsBText}
          checkboxPos='TOP'
        />
        <CancelAndConfirmButton
          cancelButtonProps={{ onClick: goBack }}
          confirmButtonProps={{
            onClick: confirmButtonClick,
            text: 'Next',
            props: { disabled: !disabled },
          }}
        />
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
`;

const TermsWrap = styled.div`
  margin-top: auto;
  .terms-A {
    margin-bottom: 13px;
  }
`;
