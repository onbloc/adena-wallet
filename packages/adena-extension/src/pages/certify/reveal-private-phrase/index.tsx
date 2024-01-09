import React, { useMemo, useState } from 'react';
import styled from 'styled-components';

import { Text, WarningBox, Button } from '@components/atoms';
import { SeedBox, SeedViewAndCopy } from '@components/molecules';
import { useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import useAppNavigate from '@hooks/use-app-navigate';

export const RevealPrivatePhrase = (): JSX.Element => {
  const { goBack } = useAppNavigate();
  const { wallet } = useWalletContext();
  const [showBlurScreen, setShowBlurScreen] = useState(true);

  const seeds = useMemo(() => {
    const mnemonic = wallet?.mnemonic || '';
    return mnemonic.split(' ');
  }, [wallet?.mnemonic]);

  return (
    <Wrapper>
      <Text type='header4'>Reveal Seed Phrase</Text>
      <WarningBox type='revealPrivate' margin='12px 0px 20px' />
      <SeedBox seeds={seeds} hasBlurScreen={showBlurScreen} />
      <SeedViewAndCopy
        showBlurScreen={showBlurScreen}
        setShowBlurScreen={setShowBlurScreen}
        copyStr={seeds.join(' ')}
        toggleText='Seed Phrase'
      />
      <Button fullWidth onClick={goBack}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};

const Wrapper = styled.main`
  ${mixins.flex({ align: 'flex-start', justify: 'flex-start' })};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
`;
