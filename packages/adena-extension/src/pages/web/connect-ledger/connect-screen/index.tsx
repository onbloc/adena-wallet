import { ReactElement, useMemo } from 'react';

import { WebMain } from '@components/atoms';

import useConnectLedgerScreen from '@hooks/web/connect-ledger/use-connect-ledger-screen';
import { WebMainHeader } from '@components/pages/web/main-header';
import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';

import ConnectRequestWallet from './connect-request-wallet';
import ConnectInit from './connect-init';
import ConnectRequest from './connect-request';
import ConnectFail from './connect-fail';
import ConnectRequestWalletLoad from './connect-request-wallet-load';
import { WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE } from '@common/constants/ui.constant';

const ConnectLedgerScreen = (): ReactElement => {
  const useConnectLedgerScreenReturn = useConnectLedgerScreen();
  const { indicatorInfo, connectState, initWallet, requestPermission, setConnectState } =
    useConnectLedgerScreenReturn;
  const { navigate } = useAppNavigate();

  const topSpacing = useMemo(() => {
    if (connectState === 'REQUEST_WALLET_LOAD' || connectState === 'NOT_PERMISSION') {
      return null;
    }
    return {
      default: WEB_TOP_SPACING,
      responsive: WEB_TOP_SPACING_RESPONSIVE,
    };
  }, [connectState]);

  return (
    <WebMain
      spacing={topSpacing?.default || null}
      responsiveSpacing={topSpacing?.responsive || null}
    >
      {topSpacing !== null && (
        <WebMainHeader
          stepLength={indicatorInfo.stepLength}
          onClickGoBack={(): void => {
            if (indicatorInfo.stepNo === 0) {
              navigate(RoutePath.WebSelectHardWallet);
            } else {
              setConnectState('INIT');
            }
          }}
          currentStep={connectState === 'REQUEST' ? -1 : indicatorInfo.stepNo}
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
