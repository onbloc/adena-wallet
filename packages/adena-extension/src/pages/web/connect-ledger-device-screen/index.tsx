import { ReactElement } from 'react';
import styled, { useTheme } from 'styled-components';
import _ from 'lodash';
import back from '@assets/web/chevron-left.svg';

import { Pressable, Row, View, WebMain } from '@components/atoms';
import WebImg from '@components/atoms/web-img';

import useConnectLedgerDeviceScreen from '@hooks/web/use-connect-ledger-device-screen';

import InitStep from './init-step';
import RequestStep from './request-step';
import ConnectionFailedStep from './connection-failed-step';
import RequestWalletStep from './request-wallet-step';
import LoadAccountsStep from './load-accounts-step';
import SelectAccountsStep from './select-accounts-step';

const StyledDot = styled(View)<{ selected: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${({ theme, selected }): string =>
    selected ? theme.webPrimary._100 : 'rgba(0, 89, 255, 0.32)'};
`;

const ConnectLedgerDeviceScreen = (): ReactElement => {
  const useConnectLedgerDeviceScreenReturn = useConnectLedgerDeviceScreen();
  const { connectState } = useConnectLedgerDeviceScreenReturn;

  const theme = useTheme();

  return (
    <WebMain>
      <Row style={{ width: '100%', justifyContent: 'space-between' }}>
        <Pressable
          onClick={(): void => {
            //
          }}
          style={{ padding: 4, backgroundColor: theme.webInput._100, borderRadius: 16 }}
        >
          <WebImg src={back} size={24} />
        </Pressable>
        <Row style={{ columnGap: 8 }}>
          {_.times(4, (index) => (
            <StyledDot key={index} selected={index + 1 === 1} />
          ))}
        </Row>
        <View />
      </Row>
      {connectState === 'INIT' && (
        <InitStep useConnectLedgerDeviceScreenReturn={useConnectLedgerDeviceScreenReturn} />
      )}
      {connectState === 'REQUEST' && (
        <RequestStep useConnectLedgerDeviceScreenReturn={useConnectLedgerDeviceScreenReturn} />
      )}
      {connectState === 'CONNECTION_FAILED' && (
        <ConnectionFailedStep
          useConnectLedgerDeviceScreenReturn={useConnectLedgerDeviceScreenReturn}
        />
      )}
      {connectState === 'REQUEST_WALLET' && <RequestWalletStep />}
      {connectState === 'LOAD_ACCOUNTS' && <LoadAccountsStep />}
      {connectState === 'SELECT_ACCOUNT' && <SelectAccountsStep />}
    </WebMain>
  );
};

export default ConnectLedgerDeviceScreen;
