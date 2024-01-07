import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

import { Text, Button, BlurScreen } from '@components/atoms';
import { SeedViewAndCopy } from '@components/molecules';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useWalletContext } from '@hooks/use-context';
import mixins from '@styles/mixins';
import { getTheme } from '@styles/theme';
import useAppNavigate from '@hooks/use-app-navige';
import { RoutePath } from '@router/path';

const StyledPrivateKeyBox = styled.div`
  position: relative;
  width: 100%;
  height: 140px;
  border: 1px solid ${getTheme('neutral', '_7')};
  background-color: ${getTheme('neutral', '_9')};
  border-radius: 18px;
  padding: 8px;
  ${mixins.flex({ direction: 'row' })};
`;

const StyledText = styled(Text)`
  word-break: break-all;
  text-align: center;
`;

const ApproachPrivateKey = (): JSX.Element => {
  const { params, goBack } = useAppNavigate<RoutePath.ExportPrivateKey>();
  const { wallet } = useWalletContext();
  const { currentAccount } = useCurrentAccount();
  const [showBlurScreen, setShowBlurScreen] = useState(true);
  const [privateKey, setPrivateKey] = useState('');

  useEffect(() => {
    initPrivateKey();
  }, [currentAccount]);

  const initPrivateKey = async (): Promise<void> => {
    if (!wallet || !currentAccount) {
      return;
    }
    const clone = wallet.clone();
    if (params?.accountId) {
      clone.currentAccountId = params.accountId;
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
      <Button fullWidth onClick={goBack}>
        <Text type='body1Bold'>Done</Text>
      </Button>
    </>
  );
};

export default ApproachPrivateKey;
