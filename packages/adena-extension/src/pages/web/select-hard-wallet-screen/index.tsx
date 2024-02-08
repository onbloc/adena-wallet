import { ReactElement, useCallback } from 'react';

import { Pressable, Row, View, WebImg, WebMain, WebText } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import IconWallet from '@assets/web/hard-wallet-rounded.svg';
import IconLedger from '@assets/web/ledger-xs.svg';
import IconKeystone from '@assets/web/keystone-xs.svg';
import IconLink from '@assets/web/link.svg';

import WebMainButton from '@components/atoms/web-main-button';
import { WebTitleWithDescription } from '@components/molecules';
import { WebMainHeader } from '@components/pages/web/main-header';
import useLink from '@hooks/use-link';
import { HARDWARE_WALLET_LEARN_PAGE } from '@common/constants/resource.constant';
import styled, { useTheme } from 'styled-components';

const StyledLinkWrapper = styled(Row)`
  gap: 6px;
  align-items: flex-start;

  & > * {
    color: #6c717a;
  }
`;

const SelectHardWalletScreen = (): ReactElement => {
  const theme = useTheme();
  const { navigate } = useAppNavigate();
  const { openLink } = useLink();

  const moveLearnMore = useCallback(() => {
    openLink(HARDWARE_WALLET_LEARN_PAGE);
  }, [openLink]);

  return (
    <WebMain spacing={272}>
      <WebMainHeader
        stepLength={0}
        onClickGoBack={(): void => {
          navigate(RoutePath.Home);
        }}
      />
      <View style={{ rowGap: 32, alignItems: 'flex-start' }}>
        <WebImg src={IconWallet} size={88} />
        <WebTitleWithDescription
          title='Select Your Hardware Wallet'
          description='Choose one of the supported hardware wallets from the list below.'
          marginBottom={12}
        />
      </View>
      <Row style={{ columnGap: 12 }}>
        <WebMainButton
          figure='primary'
          width={199}
          iconElement={<WebImg src={IconLedger} size={24} />}
          text='Continue with Ledger'
          onClick={(): void => {
            navigate(RoutePath.WebConnectLedger);
          }}
        />
        <WebMainButton
          figure='secondary'
          width={199}
          iconElement={<WebImg src={IconKeystone} size={24} />}
          text='Continue with Keystone'
          disabled
          onClick={(): void => {
            //
          }}
        />
      </Row>
      <Pressable onClick={moveLearnMore}>
        <StyledLinkWrapper>
          <WebText type='title5' color={theme.webNeutral._600}>
            Learn More
          </WebText>
          <WebImg src={IconLink} size={16} />
        </StyledLinkWrapper>
      </Pressable>
    </WebMain>
  );
};

export default SelectHardWalletScreen;
