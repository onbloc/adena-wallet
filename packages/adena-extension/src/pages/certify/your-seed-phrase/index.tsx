import React, { useCallback, useState } from 'react';
import styled from 'styled-components';
import TitleWithDesc from '@components/title-with-desc';
import SeedBox from '@components/seed-box';
import Copy from '@components/buttons/copy-button';
import TermsCheckbox from '@components/terms-checkbox';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import { Wallet } from 'adena-wallet';

const text = {
  title: 'Seed Phrase',
  desc: 'Seed phrase is the only way to recover your wallet. Keep it somewhere safe.',
  terms: 'I have saved my seed phrase.',
};

const Wrapper = styled.main`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 50px;
`;

const SeedBoxWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  margin-top: 27px;
  gap: 12px;
`;

export const YourSeedPhrase = () => {
  const [terms, setTerms] = useState(false);
  const navigate = useNavigate();
  const [seeds, setSeeds] = useState(() => Wallet.generateMnemonic());

  const handleTermsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => setTerms((prev: boolean) => !prev),
    [terms],
  );
  const handleNextButtonClick = () =>
    navigate(RoutePath.CreatePassword, {
      state: { seeds: seeds },
    });

  return (
    <Wrapper>
      <TitleWithDesc title={text.title} desc={text.desc} />
      <SeedBoxWrap>
        <SeedBox seeds={seeds.split(' ')} scroll={false} />
        <Copy seeds={seeds} tabIndex={1} />
      </SeedBoxWrap>
      <TermsCheckbox checked={terms} onChange={handleTermsChange} text={text.terms} tabIndex={2} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Primary}
        disabled={!terms}
        onClick={handleNextButtonClick}
        tabIndex={3}
      >
        <Text type='body1Bold'>Next</Text>
      </Button>
    </Wrapper>
  );
};
