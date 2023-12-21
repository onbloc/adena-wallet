import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

import { Text, Button, Copy } from '@components/atoms';
import { SeedBox, TitleWithDesc } from '@components/molecules';
import mixins from '@styles/mixins';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.main`
  ${mixins.flex('column', 'center', 'stretch')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const SeedBoxWrap = styled.div`
  ${mixins.flex('column', 'center', 'stretch')};
  width: 100%;
  margin-bottom: auto;
  margin-top: 24px;
  gap: 12px;
`;

export const ViewSeedPhrase = (): JSX.Element => {
  const navigate = useNavigate();
  const doneButtonClick = (): void => navigate(-1);
  const location = useLocation();
  const [mnemonic, setMnemonic] = useState('');
  useEffect(() => {
    const state = location.state as string;
    setMnemonic(state);
  }, []);
  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <SeedBoxWrap>
        <SeedBox seeds={mnemonic.split(' ')} />
        <Copy copyStr={mnemonic} />
      </SeedBoxWrap>
      <Button fullWidth onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
