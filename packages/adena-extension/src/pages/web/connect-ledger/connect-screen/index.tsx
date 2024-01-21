import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';

import useConnectLedgerScreen from '@hooks/web/connect-ledger/use-connect-ledger-screen';

import Header from './header';

import ConnectRequestWallet from './connect-request-wallet';
import ConnectInit from './connect-init';
import ConnectRequest from './connect-request';
import ConnectFail from './connect-fail';
import ConnectRequestWalletLoad from './connect-request-wallet-load';

const ConnectLedgerScreen = (): ReactElement => {
  const useConnectLedgerScreenReturn = useConnectLedgerScreen();
  const { connectState, initWallet, requestPermission } = useConnectLedgerScreenReturn;

  return (
    <WebMain>
      <Header useConnectLedgerScreenReturn={useConnectLedgerScreenReturn} />
      {connectState === 'INIT' && <ConnectInit init={initWallet} />}
      {connectState === 'REQUEST' && <ConnectRequest />}
      {connectState === 'NOT_PERMISSION' && <ConnectFail retry={requestPermission} />}
      {(connectState === 'REQUEST_WALLET' || connectState === 'FAILED') && (
        <ConnectRequestWallet retry={requestPermission} />
      )}
      {connectState === 'REQUEST_WALLET_LOAD' && <ConnectRequestWalletLoad />}
    </WebMain>
  );
};

export default ConnectLedgerScreen;
