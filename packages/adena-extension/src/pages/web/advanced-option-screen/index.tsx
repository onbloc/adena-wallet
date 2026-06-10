import { ReactElement, useCallback } from 'react';
import styled from 'styled-components';

import IconCreate from '@assets/web/icon-create';
import IconGoogle from '@assets/web/icon-google';
import IconImport from '@assets/web/icon-import';
import IconWallet from '@assets/web/wallet-rounded.svg';
import BackIcon from '@assets/web/chevron-left.svg';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { Pressable, View, WebImg, WebMain, WebText } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import useAppNavigate from '@hooks/use-app-navigate';
import { useWalletContext } from '@hooks/use-context';
import { RoutePath } from '@types';

const StyledWrapper = styled(View)`
  position: relative;
  width: 100%;
  align-items: flex-start;
  row-gap: 24px;
`;

const StyledBackButton = styled.div`
  position: absolute;
  top: -56px;
  left: 0;
`;

const AdvancedOptionScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const { wallet } = useWalletContext();

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
    <WebMain spacing={WEB_TOP_SPACING} responsiveSpacing={WEB_TOP_SPACING_RESPONSIVE} width='360px'>
      <StyledWrapper>
        <StyledBackButton>
          <Pressable
            onClick={(): void => navigate(RoutePath.Home)}
            style={{ padding: 4, backgroundColor: '#181b1f', borderRadius: 16 }}
          >
            <WebImg src={BackIcon} size={24} />
          </Pressable>
        </StyledBackButton>
        <WebImg src={IconWallet} size={88} />
        <View style={{ width: '100%', rowGap: 16, paddingTop: 8 }}>
          <WebText type='headline2'>Standard Wallets</WebText>
          <WebText type='body4' color='#878d99'>
            Create or restore your wallet with a seed phrase or a private key.
          </WebText>
        </View>
        <View style={{ rowGap: 16, width: '100%' }}>
          <WebMainButton
            layout='list'
            figure='primary'
            iconElement={<IconCreate />}
            text='Create New Wallet'
            description='Generate a new 12-word seed phrase you can use to create multiple accounts.'
            onClick={onClickNewWallet}
          />
          <WebMainButton
            layout='list'
            figure='secondary'
            iconElement={<IconImport />}
            text='Import Existing Wallet'
            description='Use a seed phrase or private key to import an existing wallet.'
            onClick={onClickImportExistingWallet}
          />
          <WebMainButton
            layout='list'
            figure='tertiary'
            iconElement={<IconGoogle />}
            text='Sign In With Google'
            description='Use your Google account to access your wallet.'
            onClick={onClickSignInWithGoogle}
          />
        </View>
      </StyledWrapper>
    </WebMain>
  );
};

export default AdvancedOptionScreen;
