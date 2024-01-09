import React from 'react';
import styled from 'styled-components';

import { Text, Button, Copy } from '@components/atoms';
import { SeedBox, TitleWithDesc } from '@components/molecules';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@router/path';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const Wrapper = styled.main`
  ${mixins.flex({ justify: 'stretch' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const SeedBoxWrap = styled.div`
  ${mixins.flex({ justify: 'stretch' })};
  width: 100%;
  margin-bottom: auto;
  margin-top: 24px;
  gap: 12px;
`;

export const ViewSeedPhrase = (): JSX.Element => {
  const { goBack, params } = useAppNavigate<RoutePath.ViewSeedPhrase>();

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <SeedBoxWrap>
        <SeedBox seeds={params.mnemonic.split(' ')} />
        <Copy copyStr={params.mnemonic} />
      </SeedBoxWrap>
      <Button fullWidth onClick={goBack}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
