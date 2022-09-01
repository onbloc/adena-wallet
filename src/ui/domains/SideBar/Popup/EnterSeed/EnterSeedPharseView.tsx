import React, { useState, useCallback } from 'react';
import styled from 'styled-components';
import FullButton from '@ui/common/Button/FullButton';
import { SeedScrollBox } from '@ui/common/SeedScrollBox';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import Typography from '@ui/common/Typography';
import { ErrorText } from '@ui/common/ErrorText';
import { useEnterSeed } from './useEnterSeed';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';

const text = {
  title: 'Seed Phrase',
  desc: 'Restore an existing wallet with\na 12 or 24-word seed phrase.',
};

const Wrapper = styled.section`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 50px 0px 0px;
`;

export const EnterSeedPharseView = () => {
  const { seedState, buttonState } = useEnterSeed();

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <SeedScrollBox
        value={seedState.value}
        onChange={seedState.onChange}
        error={seedState.error}
      />
      {seedState.error && <ErrorText text={seedState.errorMessage} />}
      <FullButton
        mode='primary'
        margin='auto 0px 0px'
        disabled={buttonState.disabled}
        onClick={buttonState.onClick}
      >
        <Typography type='body1Bold' disabled={buttonState.disabled}>
          Next
        </Typography>
      </FullButton>
    </Wrapper>
  );
};
