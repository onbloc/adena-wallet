import { Route, Routes } from 'react-router-dom';

import { RoutePath } from '@types';

import LandingScreen from '@pages/web/landing-screen';
import ConnectLedgerDeviceScreen from '@pages/web/connect-ledger-device-screen';
import Header from './Header';
import AdvancedOptionScreen from '@pages/web/advanced-option-screen';
import CreatePasswordScreen from '@pages/web/create-password-screan';
import GoogleLoginScreen from '@pages/web/google-login-screen';
import SetupAirgapScreen from '@pages/web/setup-airgap-screen';
import WalletCreateScreen from '@pages/web/wallet-create-screen';
import WalletImportScreen from '@pages/web/wallet-import-screen';
import WalletExportScreen from '@pages/web/wallet-export-screen';
import WalletCreateSuccessScreen from '@pages/web/wallet-create-success-screen';

export const WebRouter = (): JSX.Element => {
  return (
    <>
      <Header />
      <Routes>
        <Route path={RoutePath.Home} element={<LandingScreen />} />
        <Route
          path={RoutePath.WebConnectLedgerDeviceScreen}
          element={<ConnectLedgerDeviceScreen />}
        />
        <Route
          path={RoutePath.WebAdvancedOptionScreen}
          element={<AdvancedOptionScreen />}
        />
        <Route
          path={RoutePath.WebCreatePasswordScreen}
          element={<CreatePasswordScreen />}
        />
        <Route
          path={RoutePath.WebGoogleLoginScreen}
          element={<GoogleLoginScreen />}
        />
        <Route
          path={RoutePath.WebSetupAirgapScreen}
          element={<SetupAirgapScreen />}
        />
        <Route
          path={RoutePath.WebWalletCreateScreen}
          element={<WalletCreateScreen />}
        />
        <Route
          path={RoutePath.WebWalletImportScreen}
          element={<WalletImportScreen />}
        />
        <Route
          path={RoutePath.WebWalletExportScreen}
          element={<WalletExportScreen />}
        />
        <Route
          path={RoutePath.WebWalletCreateSuccessScreen}
          element={<WalletCreateSuccessScreen />}
        />
      </Routes>
    </>
  );
};
