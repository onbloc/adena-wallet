import { ReactElement } from 'react';

import { Row, View, WebImg, WebMain } from '@components/atoms';
import useAppNavigate from '@hooks/use-app-navigate';
import { RoutePath } from '@types';

import IconWallet from '@assets/web/hard-wallet-rounded.svg';
import IconLedger from '@assets/web/ledger-xs.svg';
import IconKeystone from '@assets/web/keystone-xs.svg';

import WebMainButton from '@components/atoms/web-main-button';
import { WebTitleWithDescription } from '@components/molecules';
import { WebMainHeader } from '@components/pages/web/main-header';

const SelectHardWalletScreen = (): ReactElement => {
  const { navigate } = useAppNavigate();

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
    </WebMain>
  );
};

export default SelectHardWalletScreen;
