import React, { useCallback, useState } from 'react';
import { Secp256k1HdWallet } from '@services/signer/secp256k1hdwallet';
import styled from 'styled-components';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import SeedBox from '@ui/common/SeedBox';
import Copy from '@ui/common/Copy';
import TermsCheckbox from '@ui/common/TermsCheckbox';
import FullButton from '@ui/common/Button/FullButton';
import Typography, { textVariants } from '@ui/common/Typography';
import { useNavigate } from 'react-router-dom';
import { RoutePath } from '@router/path';
import checkOff from '../../../../../assets/check-off.svg';
import checkOn from '../../../../../assets/check-on.svg';

const text = {
  title: 'Seed Phrase',
  desc: 'Seed phrase is the only way to recover your wallet. Keep it somewhere safe.',
  terms: 'I have saved my seed phrase.',
};

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'flex-start')};
  width: 100%;
  height: 100%;
  padding: 50px 0px 0px;
`;

const SeedBoxWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  margin-top: 27px;
  gap: 12px;
`;

export const YourSeedPhraseView = () => {
  const [terms, setTerms] = useState(false);
  const navigate = useNavigate();
  const [seeds, setSeeds] = useState(() => Secp256k1HdWallet.mnemonicGenerate());

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
        <SeedBox seeds={seeds.split(' ')} />
        <Copy seeds={seeds} tabIndex={1} />
      </SeedBoxWrap>
      <TermsCheckbox checked={terms} onChange={handleTermsChange} text={text.terms} tabIndex={2} />
      <FullButton mode='primary' disabled={!terms} onClick={handleNextButtonClick} tabIndex={3}>
        <Typography type='body1Bold' disabled={!terms}>
          Next
        </Typography>
      </FullButton>
    </Wrapper>
  );
};
