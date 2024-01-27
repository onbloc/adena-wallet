import { Route, Routes } from 'react-router-dom';

import { RoutePath } from '@types';

import LandingScreen from '@pages/web/landing-screen';
import { ConnectLedgerScreen, ConnectLedgerSelectAccount } from '@pages/web/connect-ledger';
import AdvancedOptionScreen from '@pages/web/advanced-option-screen';
import CreatePasswordScreen from '@pages/web/create-password-screen';
import GoogleLoginScreen from '@pages/web/google-login-screen';
import WalletCreateScreen from '@pages/web/wallet-create-screen';
import AccountAddScreen from '@pages/web/account-add-screen';
import AccountImportScreen from '@pages/web/account-import-screen';
import WalletImportScreen from '@pages/web/wallet-import-screen';
import WalletExportScreen from '@pages/web/wallet-export-screen';
import QuestionnaireScreen from '@pages/web/questionnaire-screen';
import WalletAllSetScreen from '@pages/web/wallet-all-set-screen';
import SetupAirgapScreen from '@pages/web/setup-airgap-screen';
import AccountAddedCompleteScreen from '@pages/web/account-added-complete-screen';

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
        <Route path={RoutePath.WebAdvancedOption} element={<AdvancedOptionScreen />} />
        <Route path={RoutePath.WebCreatePassword} element={<CreatePasswordScreen />} />
        <Route path={RoutePath.WebGoogleLogin} element={<GoogleLoginScreen />} />
        <Route path={RoutePath.WebSetupAirgap} element={<SetupAirgapScreen />} />
        <Route path={RoutePath.WebWalletCreate} element={<WalletCreateScreen />} />
        <Route path={RoutePath.WebAccountAdd} element={<AccountAddScreen />} />
        <Route path={RoutePath.WebAccountImport} element={<AccountImportScreen />} />
        <Route path={RoutePath.WebWalletImport} element={<WalletImportScreen />} />
        <Route path={RoutePath.WebWalletExport} element={<WalletExportScreen />} />
        <Route path={RoutePath.WebWalletAllSet} element={<WalletAllSetScreen />} />
        <Route path={RoutePath.WebAccountAddedComplete} element={<AccountAddedCompleteScreen />} />
        <Route path={RoutePath.WebQuestionnaire} element={<QuestionnaireScreen />} />
      </Routes>
    </>
  );
};
