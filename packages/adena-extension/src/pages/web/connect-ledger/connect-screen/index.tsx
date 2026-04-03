import {
  WEB_TOP_SPACING, WEB_TOP_SPACING_RESPONSIVE,
} from '@common/constants/ui.constant';
import {
  WebMain,
} from '@components/atoms';
import {
  WebMainHeader,
} from '@components/pages/web/main-header';
import useAppNavigate from '@hooks/use-app-navigate';
import useConnectLedgerScreen from '@hooks/web/connect-ledger/use-connect-ledger-screen';
import {
  RoutePath,
} from '@types';
import {
  ReactElement, useMemo,
} from 'react';

import ConnectFail from './connect-fail';
import ConnectInit from './connect-init';
import ConnectRequest from './connect-request';
import ConnectRequestWallet from './connect-request-wallet';
import ConnectRequestWalletLoad from './connect-request-wallet-load';

const ConnectLedgerScreen = (): ReactElement<any> => {
  const useConnectLedgerScreenReturn = useConnectLedgerScreen();
  const {
    indicatorInfo, connectState, initWallet, requestPermission, setConnectState,
  }
    = useConnectLedgerScreenReturn;
  const {
    navigate,
  } = useAppNavigate();

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
            }
            else {
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
