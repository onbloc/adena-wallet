import CancelAndConfirmButton from '@components/buttons/cancel-and-confirm-button';
import DefaultInput from '@components/default-input';
import WarningBox from '@components/warning/warning-box';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Text from '@components/text';
import TermsCheckbox from '@components/terms-checkbox';
import { RoutePath } from '@router/path';

const TermsAText = 'Anyone with the phrase will have full control over my funds.';
const TermsBText = 'I will never share my seed phrase with anyone.';

export const ApproachPasswordPhrase = () => {
  const navigate = useNavigate();
  const backButtonClick = () => navigate(-1);
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState(false);
  const [termsA, setTermsA] = useState(false);
  const [termsB, setTermsB] = useState(false);
  const disabled = termsA && termsB && pwd;

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPwd(e.target.value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && termsA && termsB && pwd) {
      confirmButtonClick();
    }
  };

  const termsAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermsA((prev: boolean) => !prev);
  };

  const termsBChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTermsB((prev: boolean) => !prev);
  };

  const confirmButtonClick = () => {
    // TODO
    navigate(RoutePath.ApproachPrivatePhrase);
  };

  return (
    <Wrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox type='approachPassword' margin='12px 0px 20px' padding='10px 18px 9px;' />
      <DefaultInput
        type='password'
        placeholder='Password'
        value={pwd}
        onChange={onChange}
        onKeyDown={onKeyDown}
        error={error}
      />
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
          cancelButtonProps={{ onClick: backButtonClick }}
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
  ${({ theme }) => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
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
