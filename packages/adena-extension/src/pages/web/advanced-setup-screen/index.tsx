import { ReactElement, useCallback } from 'react';
import styled from 'styled-components';

import BackIcon from '@assets/web/chevron-left.svg';
import IconAdvancedSetup from '@assets/web/advanced-setup-rounded.svg';
import ThunderIcon from '@assets/web/thunder.svg';
import IconCardShield from '@assets/icon-card-shield';
import IconBank from '@assets/icon-bank';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';
import { Pressable, View, WebImg, WebMain, WebText } from '@components/atoms';
import WebMainButton from '@components/atoms/web-main-button';
import useAppNavigate from '@hooks/use-app-navigate';
import { useNetwork } from '@hooks/use-network';
import { isSessionSupportedNetwork } from '@common/utils/account-session';
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

const AdvancedSetupScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();
  const { currentNetwork } = useNetwork();
  const sessionAccountEnabled = isSessionSupportedNetwork(currentNetwork);

  const onClickSessionAccount = useCallback(() => {
    navigate(RoutePath.WebSessionAdd);
  }, [navigate]);

  const onClickAirgapAccount = useCallback(() => {
    navigate(RoutePath.WebSetupAirgap);
  }, [navigate]);

  const onClickMultisigAccount = useCallback(() => {
    navigate(RoutePath.WebSetupMultisig);
  }, [navigate]);

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
        <WebImg src={IconAdvancedSetup} size={88} />
        <View style={{ width: '100%', rowGap: 16, paddingTop: 8 }}>
          <WebText type='headline2'>Advanced Setup</WebText>
          <WebText type='body4' color='#878d99'>
            These accounts offer the highest grade of security for advanced users.
          </WebText>
        </View>
        <View style={{ rowGap: 16, width: '100%' }}>
          <WebMainButton
            layout='list'
            figure='primary'
            iconElement={<WebImg src={ThunderIcon} size={24} />}
            text='Session Account'
            description='Access your master account with temporary, scoped permissions.'
            disabled={!sessionAccountEnabled}
            onClick={onClickSessionAccount}
          />
          <WebMainButton
            layout='list'
            figure='secondary'
            iconElement={<IconCardShield />}
            text='Airgap Account'
            description='Broadcast transactions signed from a custom air-gapped environment.'
            onClick={onClickAirgapAccount}
          />
          <WebMainButton
            layout='list'
            figure='tertiary'
            iconElement={<IconBank />}
            text='Multi-sig Account'
            description='Requires multiple signers to authorize a transaction.'
            onClick={onClickMultisigAccount}
          />
        </View>
      </StyledWrapper>
    </WebMain>
  );
};

export default AdvancedSetupScreen;
