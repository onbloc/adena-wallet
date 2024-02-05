import { ReactElement, useCallback } from 'react';
import styled, { useTheme } from 'styled-components';
import Lottie from 'react-lottie';
import { useQuery } from '@tanstack/react-query';

import { Row, View, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import welcomeJson from '@assets/web/lottie/welcome.json';
import { useAdenaContext } from '@hooks/use-context';
import WebMainButton from '@components/atoms/web-main-button';
import IconHardwareWallet from '@assets/icon-hardware-wallet';
import IconAirgap from '@assets/icon-airgap';
import IconThunder from '@assets/icon-thunder';

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
        <WebMainButton
          figure='primary'
          width={199}
          iconElement={<IconHardwareWallet />}
          text='Connect Hardware Wallet'
          onClick={(): void => {
            navigate(RoutePath.WebConnectLedger);
          }}
        />
        <WebMainButton
          figure='secondary'
          width={199}
          iconElement={<IconAirgap />}
          text='Set Up Airgap Account'
          onClick={moveSetupAirgapScreen}
        />
        <WebMainButton
          figure='tertiary'
          width={199}
          iconElement={<IconThunder />}
          text='Advanced Options'
          onClick={(): void => {
            navigate(RoutePath.WebAdvancedOption);
          }}
        />
      </Row>
    </WebMain>
  );
};

export default LandingScreen;
