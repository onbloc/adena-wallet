import { useQuery } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useMemo, useRef } from 'react';
import styled, { useTheme } from 'styled-components';

import { useAdenaContext } from '@hooks/use-context';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';
import { WEB_LARGE_CONTENT_WIDTH } from '@common/constants/ui.constant';

import { Row, View, WebMain, WebText } from '@components/atoms';
import IconAirgap from '@assets/icon-airgap';
import IconMultisig from '@assets/icon-multisig';
import IconHardwareWallet from '@assets/icon-hardware-wallet';
import IconThunder from '@assets/icon-thunder';
import AnimationAddAccount from '@assets/web/lottie/add-account.json';
import welcomeJson from '@assets/web/lottie/welcome.json';
import Lottie from '@components/atoms/lottie';
import WebMainButton from '@components/atoms/web-main-button';
import WalletCreationHelpOverlay from '@components/pages/web/wallet-creation-help-overlay/wallet-creation-help-overlay';

const StyledAnimationWrapper = styled.div`
  display: block;
  height: 88px;
  margin-bottom: 4px;
  overflow: visible;
`;

const LandingScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const { walletService } = useAdenaContext();
  const theme = useTheme();
  const hardwareWalletButtonRef = useRef<HTMLButtonElement>(null);
  const airgapAccountButtonRef = useRef<HTMLButtonElement>(null);
  const advancedOptionButtonRef = useRef<HTMLButtonElement>(null);

  const { data: existWallet, isLoading } = useQuery(
    ['existWallet', walletService],
    async () => walletService.existsWallet(),
    {},
  );

  const { data: visibleGuide, refetch: refetchVisibleGuide } = useQuery(
    ['landingScreen/visibleGuide', existWallet],
    async () => {
      if (existWallet === undefined) {
        return false;
      }
      const isSkip = await walletService.isSkipWalletGuide(existWallet);
      return isSkip === false;
    },
    {},
  );

  const animationMarginLeftSize = useMemo(() => {
    if (existWallet) {
      return -10;
    }
    return -50;
  }, [existWallet]);

  const moveSetupAirgapScreen = useCallback(() => {
    navigate(RoutePath.WebSetupAirgap);
  }, []);

  const moveSetupMultisigScreen = useCallback(() => {
    navigate(RoutePath.WebSetupMultisig);
  }, []);

  const confirmWalletGuide = useCallback(() => {
    if (existWallet === undefined) {
      return;
    }
    walletService.updateWalletGuideConfirmDate(existWallet).finally(refetchVisibleGuide);
  }, [walletService, existWallet]);

  if (isLoading) {
    return <WebMain />;
  }

  return (
    <WebMain width={`${WEB_LARGE_CONTENT_WIDTH}px`}>
      {existWallet ? (
        <React.Fragment>
          <StyledAnimationWrapper>
            <Lottie speed={1} height={88} animationData={AnimationAddAccount} visibleSize={264} />
          </StyledAnimationWrapper>
          <View style={{ rowGap: 16 }}>
            <WebText type='headline1'>{'Add Account'}</WebText>
            <WebText type='body2' color={theme.webNeutral._500} style={{ whiteSpace: 'nowrap' }}>
              {'Select a method to add a new account to Adena.'}
            </WebText>
          </View>
        </React.Fragment>
      ) : (
        <React.Fragment>
          <StyledAnimationWrapper>
            <Lottie
              style={{ marginLeft: animationMarginLeftSize }}
              speed={1}
              height={88}
              animationData={welcomeJson}
              visibleSize={264}
            />
          </StyledAnimationWrapper>
          <View style={{ rowGap: 16 }}>
            <WebText type='headline1'>{'Welcome to Adena!'}</WebText>
            <WebText type='body2' color={theme.webNeutral._500} style={{ whiteSpace: 'nowrap' }}>
              {'The only wallet you need for Gno.land with unparalleled security.'}
            </WebText>
          </View>
        </React.Fragment>
      )}

      <Row style={{ width: '100%', columnGap: 12, marginTop: 8 }}>
        <WebMainButton
          buttonRef={hardwareWalletButtonRef}
          figure='primary'
          iconElement={<IconHardwareWallet />}
          text='Hardware Wallet'
          onClick={(): void => {
            navigate(RoutePath.WebSelectHardWallet);
          }}
        />
        <WebMainButton
          buttonRef={airgapAccountButtonRef}
          figure='secondary'
          iconElement={<IconAirgap />}
          text='Airgap Account'
          onClick={moveSetupAirgapScreen}
        />
        <WebMainButton
          buttonRef={airgapAccountButtonRef}
          figure='quinary'
          iconElement={<IconMultisig />}
          text='Multi-sig Account'
          onClick={moveSetupMultisigScreen}
        />
        <WebMainButton
          buttonRef={advancedOptionButtonRef}
          figure='tertiary'
          iconElement={<IconThunder />}
          text='Advanced Options'
          onClick={(): void => {
            navigate(RoutePath.WebAdvancedOption);
          }}
        />
      </Row>

      {visibleGuide && (
        <WalletCreationHelpOverlay
          hardwareWalletButtonRef={hardwareWalletButtonRef}
          airgapAccountButtonRef={airgapAccountButtonRef}
          advancedOptionButtonRef={advancedOptionButtonRef}
          onFinish={confirmWalletGuide}
        />
      )}
    </WebMain>
  );
};

export default LandingScreen;
