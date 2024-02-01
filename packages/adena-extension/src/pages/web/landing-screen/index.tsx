import { ReactElement, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';
import { useQuery } from '@tanstack/react-query';

import { Row, View, WebButton, WebMain, WebText, WebImg } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import welcomeJson from '@assets/web/lottie/welcome.json';
import hardWallet from '@assets/web/hard-wallet.svg';
import airgap from '@assets/web/airgap.svg';
import thunder from '@assets/web/thunder.svg';
import { useAdenaContext } from '@hooks/use-context';

const StyledAnimationWrapper = styled.div`
  display: block;
  height: 88px;
  overflow: visible;
`

const LandingScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const { walletService } = useAdenaContext();
  const theme = useTheme();

  const { data: existWallet } = useQuery(
    ['existWallet', walletService],
    async () => walletService.existsWallet(),
    {},
  );

  const moveSetupAirgapScreen = useCallback(() => {
    navigate(RoutePath.WebSetupAirgap);
  }, []);

  return (
    <WebMain spacing={344}>
      <StyledAnimationWrapper>
        <Lottie
          style={{ marginTop: -320 }}
          options={{
            animationData: welcomeJson,
          }}
          height={320}
        />
      </StyledAnimationWrapper>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline1'>{existWallet ? 'Add Account' : 'Welcome to Adena'}</WebText>
        <WebText type='body2' color={theme.webNeutral._500}>
          {existWallet
            ? 'Select a method to add a new account to Adena.'
            : 'The only wallet you need for Gnoland with unparalleled security'}
        </WebText>
      </View>

      <Row style={{ columnGap: 12 }}>
        <WebButton
          figure='primary'
          size='large'
          onClick={(): void => {
            navigate(RoutePath.WebConnectLedger);
          }}
          style={{ width: 204 }}
        >
          <View style={{ width: 172, height: 74, justifyContent: 'space-between' }}>
            <WebImg src={hardWallet} size={24} />
            <WebText type='title5' color='inherit'>Connect Hardware Wallet</WebText>
          </View>
        </WebButton>
        <WebButton
          figure='secondary'
          size='large'
          style={{ width: 204 }}
          onClick={moveSetupAirgapScreen}
        >
          <View style={{ width: 172, height: 74, justifyContent: 'space-between' }}>
            <WebImg src={airgap} size={24} />
            <WebText type='title5' color='inherit'>Set Up Airgap Account</WebText>
          </View>
        </WebButton>
        <WebButton
          figure='tertiary'
          size='large'
          onClick={(): void => {
            navigate(RoutePath.WebAdvancedOption);
          }}
          style={{ width: 204 }}
        >
          <View style={{ width: 172, height: 74, justifyContent: 'space-between' }}>
            <WebImg src={thunder} size={24} />
            <WebText type='title5' color='inherit'>Advanced Options</WebText>
          </View>
        </WebButton>
      </Row>
    </WebMain>
  );
};

export default LandingScreen;
