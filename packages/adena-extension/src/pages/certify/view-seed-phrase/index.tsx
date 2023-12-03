import Copy from '@components/buttons/copy-button';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedBox from '@components/seed-box';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import React, { useEffect, useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const SeedBoxWrap = styled.div`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'center', 'stretch')};
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
        <SeedBox seeds={mnemonic.split(' ')} scroll={false} />
        <Copy copyStr={mnemonic} />
      </SeedBoxWrap>
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
