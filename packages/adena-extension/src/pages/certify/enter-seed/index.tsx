import React from 'react';
import styled from 'styled-components';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedBox from '@components/seed-box';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import { ErrorText } from '@components/error-text';
import { useEnterSeed } from './use-enter-seed';

const text = {
  title: 'Seed Phrase',
  desc: 'Restore an existing wallet with\na 12 or 24-word seed phrase.',
};

const Wrapper = styled.main`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

export const EnterSeedPharse = () => {
  const { seedState, buttonState } = useEnterSeed();

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <SeedBox
        value={seedState.value}
        onChange={seedState.onChange}
        onKeyDown={seedState.onKeyDown}
        error={seedState.error}
        scroll={true}
      />
      {seedState.error && <ErrorText text={seedState.errorMessage} />}
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        margin='auto 0px 0px'
        disabled={buttonState.disabled}
        onClick={buttonState.onClick}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
