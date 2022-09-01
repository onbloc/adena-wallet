import Copy from '@ui/common/Copy';
import FullButton from '@ui/common/Button/FullButton';
import SeedBox from '@ui/common/SeedBox';
import TitleWithDesc from '@ui/common/TitleWithDesc';
import Typography from '@ui/common/Typography';
import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

const text = {
  title: 'Reveal Seed Phrase',
  desc: 'Your seed phrase is the only way to\nrestore your wallet. Keep it somewhere\nsafe.',
};

const seedString = 'test1 test2 test3 test4 test5 test6 test7 test8 test9 test10 test11 test12';

const seedData = [
  'test1',
  'test2',
  'test3',
  'test4',
  'test5',
  'test6',
  'test7',
  'test8',
  'test9',
  'test10',
  'test11',
  'test12',
];

const Wrapper = styled.section`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  .error {
    width: 100%;
    padding-left: 16px;
  }
`;

const SeedBoxWrap = styled.div`
  ${({ theme }) => theme.mixins.flexbox('column', 'center', 'stretch')};
  width: 100%;
  margin-bottom: auto;
  margin-top: 24px;
  gap: 12px;
`;

export const ViewSeedPhraseView = () => {
  const navigate = useNavigate();
  const doneButtonClick = () => navigate(-1);
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
        <Copy seeds={mnemonic} />
      </SeedBoxWrap>
      <FullButton mode='primary' onClick={doneButtonClick}>
        <Typography type='body1Bold'>Done</Typography>
      </FullButton>
    </Wrapper>
  );
};
