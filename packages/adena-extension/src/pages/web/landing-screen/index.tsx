import { useQuery } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import styled from 'styled-components';

import { useAdenaContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import { View, WebMain } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import IconStandardWallet from '@assets/icon-standard-wallet';
import IconUsb from '@assets/icon-usb';
import IconAdvancedSetup from '@assets/icon-advanced-setup';
import AnimationAddAccount from '@assets/web/lottie/add-account.json';
import welcomeJson from '@assets/web/lottie/welcome.json';
import Lottie from '@components/atoms/lottie';
import { WebText } from '@components/atoms/web-text';

const StyledAnimationWrapper = styled.div`
  display: block;
  width: 100%;
  height: 88px;
  margin-bottom: 4px;
  overflow: visible;
`;

const LandingScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const { walletService } = useAdenaContext();

  const { data: existWallet, isLoading } = useQuery(
    ['existWallet', walletService],
    async () => walletService.existsWallet(),
    {},
  );

  if (isLoading) {
    return <WebMain />;
  }

  return (
    <WebMain width='360px'>
      <View style={{ rowGap: 40, width: '100%' }}>
        <View style={{ rowGap: 24 }}>
          <StyledAnimationWrapper>
            <Lottie
              speed={1}
              height={88}
              animationData={existWallet ? AnimationAddAccount : welcomeJson}
              visibleSize={264}
            />
          </StyledAnimationWrapper>
          <View style={{ rowGap: 8 }}>
            <WebText type='headline4'>
              {existWallet ? 'Add Account' : 'Welcome to Adena'}
            </WebText>
            <WebText type='body4' color='#8D9199'>
              {existWallet
                ? 'Select a method to add a new account to Adena.'
                : 'The only wallet you need for Gnoland with unparalleled security'}
            </WebText>
          </View>
        </View>

        <View style={{ rowGap: 16, width: '100%' }}>
          <WebMainButton
            layout='list'
            figure='primary'
            iconElement={<IconStandardWallet />}
            text='Standard Wallets'
            description='Create or import accounts with a seed phrase, private key, or Google login.'
            onClick={(): void => {
              navigate(RoutePath.WebAdvancedOption);
            }}
          />
          <WebMainButton
            layout='list'
            figure='secondary'
            iconElement={<IconUsb />}
            text='Hardware Wallets'
            description='Connect your accounts from hardware wallets like Ledger.'
            onClick={(): void => {
              navigate(RoutePath.WebSelectHardWallet);
            }}
          />
          <WebMainButton
            layout='list'
            figure='tertiary'
            iconElement={<IconAdvancedSetup />}
            text='Advanced Setup'
            description='Session, Airgap, and Multi-sig accounts for advanced key management.'
            onClick={(): void => {
              navigate(RoutePath.WebAdvancedSetup);
            }}
          />
        </View>
      </View>
    </WebMain>
  );
};

export default LandingScreen;
