import { ReactElement } from 'react';
import { useTheme } from 'styled-components';
import Lottie from 'react-lottie';

import welcomeJson from '@assets/web/lottie/welcome.json';
import hardWallet from '@assets/web/hard-wallet.svg';
import airgap from '@assets/web/airgap.svg';
import thunder from '@assets/web/thunder.svg';

import { Row, View, WebButton, WebMain, WebText, WebImg } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

const LandingScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const theme = useTheme();

  return (
    <WebMain>
      <View style={{ marginLeft: -100, marginTop: -200 }}>
        <Lottie
          options={{
            animationData: welcomeJson,
          }}
          height={320}
        />
      </View>
      <View style={{ rowGap: 16 }}>
        <WebText type='headline1'>Welcome to Adena</WebText>
        <WebText type='body2' color={theme.webNeutral._500}>
          The only wallet you need for Gnoland with unparalleled security
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
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={hardWallet} size={24} />
            <WebText type='title5'>Connect Hardware Wallet</WebText>
          </View>
        </WebButton>
        <WebButton figure='secondary' size='large' style={{ width: 204 }}>
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={airgap} size={24} />
            <WebText type='title5'>Set Up Airgap Account</WebText>
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
          <View style={{ height: 74, justifyContent: 'space-between' }}>
            <WebImg src={thunder} size={24} />
            <WebText type='title5'>Advanced Options</WebText>
          </View>
        </WebButton>
      </Row>
    </WebMain>
  );
};

export default LandingScreen;