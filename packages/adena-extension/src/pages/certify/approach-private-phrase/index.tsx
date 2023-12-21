import React, { useEffect, useState } from 'react';
import styled, { CSSProp } from 'styled-components';
import { useLocation, useNavigate } from 'react-router-dom';

import { Text, WarningBox, Button, ButtonHierarchy, BlurScreen } from '@components/atoms';
import { SeedViewAndCopy } from '@components/molecules';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useWalletContext } from '@hooks/use-context';

const Wrapper = styled.main`
  ${({ theme }): CSSProp => theme.mixins.flexbox('column', 'flex-start', 'flex-start')};
  width: 100%;
  height: 100%;
  padding-top: 24px;
  overflow-y: auto;
  .private-key-style {
    ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
    .seed-text {
      word-break: break-all;
      text-align: center;
    }
  }
`;

const StyledPrivateKeyBox = styled.div`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${({ theme }): string => theme.color.neutral[6]};
  background-color: ${({ theme }): string => theme.color.neutral[8]};
  border-radius: 18px;
  padding: 8px;
  ${({ theme }): CSSProp => theme.mixins.flexbox('row', 'center', 'center')};
`;

const StyledText = styled(Text)`
  word-break: break-all;
  text-align: center;
`;

export const ApproachPrivatePhrase = (): JSX.Element => {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { wallet } = useWalletContext();
  const { currentAccount } = useCurrentAccount();
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    initPrivateKey();
  }, [currentAccount, state]);

  const initPrivateKey = async (): Promise<void> => {
    if (!wallet || !currentAccount) {
      return;
    }
    const clone = wallet.clone();
    if (state?.accountId) {
      clone.currentAccountId = state.accountId;
    } else {
      clone.currentAccountId = currentAccount.id;
    }
    const privateKey = clone.privateKeyStr;
    setPrivateKey('0x' + privateKey);
  };

  const doneButtonClick = (): void => {
    navigate(-2);
  };

  return (
    <Wrapper>
      <Text type='header4'>Export Private Key</Text>
      <WarningBox type='approachPrivate' margin='12px 0px 20px' />
      <StyledPrivateKeyBox>
        <StyledText type='captionReg'>{privateKey}</StyledText>
        {showBlurScreen && <BlurScreen />}
      </StyledPrivateKeyBox>
      <SeedViewAndCopy
        showBlurScreen={showBlurScreen}
        setShowBlurScreen={setShowBlurScreen}
        copyStr={privateKey}
        toggleText='Private Key'
      />
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={doneButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </Wrapper>
  );
};
