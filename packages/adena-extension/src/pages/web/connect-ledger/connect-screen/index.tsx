import { ReactElement, useMemo } from 'react';

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
  const { indicatorInfo, connectState, initWallet, requestPermission, setConnectState } =
    useConnectLedgerScreenReturn;
  const { navigate } = useAppNavigate();
  const step = connectLedgerStep[connectState];

  const topSpacing = useMemo(() => {
    if (connectState === 'REQUEST_WALLET_LOAD' || connectState === 'NOT_PERMISSION') {
      return null;
    }
    return 272;
  }, [connectState]);

  return (
    <WebMain spacing={topSpacing}>
      {topSpacing !== null && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          onClickGoBack={(): void => {
            if (indicatorInfo.stepNo === 0) {
              navigate(RoutePath.WebSelectHardWallet);
            } else {
              setConnectState(step.backTo);
            }
          }}
          currentStep={indicatorInfo.stepNo}
        />
      )}
      {connectState === 'INIT' && <ConnectInit init={initWallet} />}
      {connectState === 'REQUEST' && <ConnectRequest />}
      {connectState === 'NOT_PERMISSION' && <ConnectFail retry={requestPermission} />}
      {(connectState === 'REQUEST_WALLET' || connectState === 'FAILED') && <ConnectRequestWallet />}
      {connectState === 'REQUEST_WALLET_LOAD' && <ConnectRequestWalletLoad />}
    </WebMain>
  );
};

export default ConnectLedgerScreen;
