import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedBox from '@components/seed-box';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { ErrorText } from '@components/error-text';
import { useEnterSeed } from './use-enter-seed';
import TermsCheckbox from '@components/terms-checkbox';
import { useLocation } from 'react-router-dom';

const walletContent = {
  title: 'Import with Seed Phrase',
  desc: 'Import an existing wallet with\na 12 or 24-word seed phrase.',
  terms: 'This phrase will only be stored on this device. Adena can’t recover it for you.',
};

const forgotContent = {
  title: 'Enter Seed Phrase ',
  desc: 'Reset your password with\na 12 or 24-word seed phrase.',
  terms: 'This phrase will only be stored on this device. Adena can’t recover it for you.',
};

export const EnterSeedPharse = () => {
  const { seedState, termsState, buttonState } = useEnterSeed();
  const { state } = useLocation();

  return (
    <Wrapper onKeyDown={seedState.onKeyDown}>
      <TitleWithDesc
        title={state.from === 'forgot-password' ? forgotContent.title : walletContent.title}
        desc={state.from === 'forgot-password' ? forgotContent.desc : walletContent.desc}
      />
      <SeedBox
        value={seedState.value}
        onChange={seedState.onChange}
        onKeyDown={seedState.onKeyDown}
        error={seedState.error}
        scroll={true}
      />
      {seedState.error && <ErrorText text={seedState.errorMessage} />}
      <TermsWrap>
        <TermsCheckbox
          checked={termsState.terms}
          onChange={termsState.onChange}
          tabIndex={2}
          text={state.from === 'forgot-password' ? forgotContent.terms : walletContent.terms}
          checkboxPos='TOP'
        />
        <Button
          fullWidth
          hierarchy={ButtonHierarchy.Primary}
          margin='auto 0px 0px'
          disabled={!buttonState.disabled}
          onClick={buttonState.onClick}
        >
          <Text type='body1Bold'>Next</Text>
        </Button>
      </TermsWrap>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 50px;
  .seed-box {
    margin-top: 27px;
  }
`;

const TermsWrap = styled.div`
  margin-top: auto;
  width: 100%;
  .terms-A {
    margin-bottom: 13px;
  }
`;
