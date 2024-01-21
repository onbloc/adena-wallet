import { Route, Routes } from 'react-router-dom';

import { RoutePath } from '@types';

import LandingScreen from '@pages/web/landing-screen';
import {
  ConnectLedgerScreen,
  ConnectLedgerSelectAccount,
  ConnectLedgerFinish,
  ConnectLedgerAllSet,
  ConnectLedgerPassword,
} from '@pages/web/connect-ledger';
import AdvancedOptionScreen from '@pages/web/advanced-option-screen';
import CreatePasswordScreen from '@pages/web/create-password-screan';
import GoogleLoginScreen from '@pages/web/google-login-screen';
import SetupAirgapScreen from '@pages/web/setup-airgap-screen';
import WalletCreateScreen from '@pages/web/wallet-create-screen';
import WalletImportScreen from '@pages/web/wallet-import-screen';
import WalletExportScreen from '@pages/web/wallet-export-screen';
import WalletCreateSuccessScreen from '@pages/web/wallet-create-success-screen';

import Header from './Header';

export const WebRouter = (): JSX.Element => {
  return (
    <>
      <Header />
      <Routes>
        <Route path={RoutePath.Home} element={<LandingScreen />} />
        <Route path={RoutePath.WebConnectLedger} element={<ConnectLedgerScreen />} />
        <Route
          path={RoutePath.WebConnectLedgerSelectAccount}
          element={<ConnectLedgerSelectAccount />}
        />
        <Route path={RoutePath.WebConnectLedgerFinish} element={<ConnectLedgerFinish />} />
        <Route path={RoutePath.WebConnectLedgerAllSet} element={<ConnectLedgerAllSet />} />
        <Route path={RoutePath.WebConnectLedgerPassword} element={<ConnectLedgerPassword />} />
        <Route path={RoutePath.WebConnectLedgerPassword} element={<ConnectLedgerPassword />} />
        <Route path={RoutePath.WebConnectLedgerPassword} element={<ConnectLedgerPassword />} />
        <Route path={RoutePath.WebAdvancedOption} element={<AdvancedOptionScreen />} />
        <Route path={RoutePath.WebCreatePassword} element={<CreatePasswordScreen />} />
        <Route path={RoutePath.WebGoogleLogin} element={<GoogleLoginScreen />} />
        <Route path={RoutePath.WebSetupAirgap} element={<SetupAirgapScreen />} />
        <Route path={RoutePath.WebWalletCreate} element={<WalletCreateScreen />} />
        <Route path={RoutePath.WebWalletImport} element={<WalletImportScreen />} />
        <Route path={RoutePath.WebWalletExport} element={<WalletExportScreen />} />
        <Route path={RoutePath.WebWalletCreateSuccess} element={<WalletCreateSuccessScreen />} />
      </Routes>
    </>
  );
};
