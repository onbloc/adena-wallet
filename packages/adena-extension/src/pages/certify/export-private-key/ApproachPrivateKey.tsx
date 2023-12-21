import React, { useEffect, useState } from 'react';
import styled from 'styled-components';
import { useLocation } from 'react-router-dom';

import { Text, Button, ButtonHierarchy, BlurScreen } from '@components/atoms';
import { SeedViewAndCopy } from '@components/molecules';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import theme from '@styles/theme';

const StyledPrivateKeyBox = styled.div`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${theme.color.neutral[6]};
  background-color: ${theme.color.neutral[8]};
  border-radius: 18px;
  padding: 8px;
  ${mixins.flex('row', 'center', 'center')};
`;

const StyledText = styled(Text)`
  word-break: break-all;
  text-align: center;
`;

const ApproachPrivateKey = ({ backButtonClick }: { backButtonClick: () => void }): JSX.Element => {
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

    setPrivateKey(`0x${clone.privateKeyStr}`);
  };

  return (
    <>
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
      <Button fullWidth hierarchy={ButtonHierarchy.Primary} onClick={backButtonClick}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </>
  );
};

export default ApproachPrivateKey;
