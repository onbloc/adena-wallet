import { ReactElement, useCallback, useRef } from 'react';
import styled, { useTheme } from 'styled-components';

import IconCreate from '@assets/web/icon-create';
import IconGoogle from '@assets/web/icon-google';
import IconImport from '@assets/web/icon-import';
import IconThunder from '@assets/web/round-thunder.svg';
import IconWarning from '@assets/web/warning.svg';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { Row, View, WebImg, WebMain, WebText } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import { WebMainHeader } from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import { getTheme } from '@styles/theme';
import { RoutePath } from '@types';

const StyledWarnBox = styled(Row)`
  column-gap: 4px;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid ${getTheme('webWarning', '_100')}0a;
  background: ${getTheme('webWarning', '_100')}14;
`;

const AdvancedOptionScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const theme = useTheme();
  const { wallet } = useWalletContext();
  const createWalletButtonRef = useRef<HTMLButtonElement>(null);
  const importWalletButtonRef = useRef<HTMLButtonElement>(null);
  const signInWithGoogleButtonRef = useRef<HTMLButtonElement>(null);

  const onClickNewWallet = useCallback(() => {
    if (wallet && wallet.hasHDWallet()) {
      navigate(RoutePath.WebAccountAdd);
      return;
    }
    navigate(RoutePath.WebWalletCreate);
  }, [wallet]);

  const onClickImportExistingWallet = useCallback(() => {
    if (wallet) {
      navigate(RoutePath.WebAccountImport);
      return;
    }
    navigate(RoutePath.WebWalletImport);
  }, [wallet]);

  const onClickSignInWithGoogle = useCallback(() => {
    navigate(RoutePath.WebGoogleLogin);
  }, []);

  return (
    <WebMain spacing={WEB_TOP_SPACING} responsiveSpacing={WEB_TOP_SPACING_RESPONSIVE}>
      <WebMainHeader
        stepLength={0}
        onClickGoBack={(): void => {
          navigate(RoutePath.Home);
        }}
      />
      <WebImg src={IconThunder} size={88} />
      <View style={{ width: '100%', rowGap: 16, paddingTop: 8 }}>
        <WebText type='headline2'>Advanced Options</WebText>
        <StyledWarnBox>
          <WebImg src={IconWarning} size={20} />
          <WebText type='body6' color={theme.webWarning._100}>
            These options involve sensitive information and should only be used by experienced
            users.
          </WebText>
        </StyledWarnBox>
      </View>

      <Row style={{ width: '100%', columnGap: 12 }}>
        <WebMainButton
          buttonRef={createWalletButtonRef}
          figure='primary'
          iconElement={<IconCreate />}
          text='Create New Wallet'
          onClick={onClickNewWallet}
        />
        <WebMainButton
          buttonRef={importWalletButtonRef}
          figure='secondary'
          iconElement={<IconImport />}
          text='Import Existing Wallet'
          onClick={onClickImportExistingWallet}
        />
        <WebMainButton
          buttonRef={signInWithGoogleButtonRef}
          figure='tertiary'
          iconElement={<IconGoogle />}
          text='Sign In With Google'
          onClick={onClickSignInWithGoogle}
        />
      </Row>
    </WebMain>
  );
};

export default AdvancedOptionScreen;
