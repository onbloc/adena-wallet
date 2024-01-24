import { ReactElement } from 'react';

import { WebMain } from '@components/atoms';

import useConnectLedgerScreen, {
  connectLedgerStep,
} from '@hooks/web/connect-ledger/use-connect-ledger-screen';
import { WebMainHeader } from '@components/pages/web/main-header';
import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';

import ConnectRequestWallet from './connect-request-wallet';
import ConnectInit from './connect-init';
import ConnectRequest from './connect-request';
import ConnectFail from './connect-fail';
import ConnectRequestWalletLoad from './connect-request-wallet-load';

const ConnectLedgerScreen = (): ReactElement => {
  const useConnectLedgerScreenReturn = useConnectLedgerScreen();
  const { connectState, initWallet, requestPermission, setConnectState } =
    useConnectLedgerScreenReturn;
  const { navigate } = useAppNavigate();
  const step = connectLedgerStep[connectState];

  return (
    <WebMain>
      <WebMainHeader
        stepLength={5}
        onClickGoBack={(): void => {
          if (step.stepNo === 0) {
            navigate(RoutePath.Home);
          } else {
            setConnectState(step.backTo);
          }
        }}
        currentStep={step.stepNo}
      />
      {connectState === 'INIT' && <ConnectInit init={initWallet} />}
      {connectState === 'REQUEST' && <ConnectRequest />}
      {connectState === 'NOT_PERMISSION' && <ConnectFail retry={requestPermission} />}
      {(connectState === 'REQUEST_WALLET' || connectState === 'FAILED') && <ConnectRequestWallet />}
      {connectState === 'REQUEST_WALLET_LOAD' && <ConnectRequestWalletLoad />}
    </WebMain>
  );
};

export default ConnectLedgerScreen;
