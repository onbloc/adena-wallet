import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import Text from '@components/text';
import WarningBox from '@components/warning/warning-box';
import SeedBox from '@components/seed-box';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import SeedViewAndCopy from '@components/buttons/seed-view-and-copy';
import { useNavigate } from 'react-router-dom';
import { useWalletContext } from '@hooks/use-context';

export const RevealPrivatePhrase = () => {
  const navigate = useNavigate();
  const { wallet } = useWalletContext();
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const [seeds, setSeeds] = useState<Array<string>>([]);

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const mnemonic = wallet?.mnemonic || '';
    const seeds = `${mnemonic}`.split(' ');
    setSeeds(seeds);
  };

  const doneButtonClick = () => {
    navigate(-2);
  };

  return (
    <Wrapper>
      <Text type='header4'>Reveal Seed Phrase</Text>
      <WarningBox type='revealPrivate' margin='12px 0px 20px' />
      <SeedBox seeds={seeds} scroll={false} hasBlurScreen={showBlurScreen} />
      <SeedViewAndCopy
        showBlurScreen={showBlurScreen}
        setShowBlurScreen={setShowBlurScreen}
        copyStr={seeds.join(' ')}
        toggleText='Seed Phrase'
      />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
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
