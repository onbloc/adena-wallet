import { ReactElement, useCallback } from 'react';
import styled from 'styled-components';

import { Pressable, View, WebImg, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import BackIcon from '@assets/web/chevron-left.svg';
import IconWallet from '@assets/web/hard-wallet-rounded.svg';
import IconLedger from '@assets/web/ledger-xs.svg';
import IconKeystone from '@assets/web/keystone-xs.svg';
import WebMainButton from '@components/atoms/web-main-button';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';

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

const SelectHardWalletScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();

  const onClickLedger = useCallback(() => {
    navigate(RoutePath.WebConnectLedger);
  }, [navigate]);

  const onClickKeystone = useCallback(() => undefined, []);

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
          <WebText type='headline2'>Hardware Wallets</WebText>
          <WebText type='body4' color='#878d99'>
            Choose one of the supported hardware wallets from the list below.
          </WebText>
        </View>
        <View style={{ rowGap: 16, width: '100%' }}>
          <WebMainButton
            layout='list'
            listAlign='center'
            figure='primary'
            iconElement={<WebImg src={IconLedger} size={24} />}
            text='Continue with Ledger'
            onClick={onClickLedger}
          />
          <WebMainButton
            layout='list'
            listAlign='center'
            figure='tertiary'
            iconElement={<WebImg src={IconKeystone} size={24} />}
            text='Continue with Keystone'
            disabled
            onClick={onClickKeystone}
          />
        </View>
      </StyledWrapper>
    </WebMain>
  );
};

export default SelectHardWalletScreen;
