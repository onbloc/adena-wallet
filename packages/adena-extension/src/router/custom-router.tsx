import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { RoutePath } from './path';
import { Header } from '@layouts/header';
import { Navigation } from '@layouts/navigation';
import { WalletCreate } from '@pages/wallet/wallet-create';
import { ApproveTransactionMain } from '@pages/wallet/approve-transaction-main';
import { ApproveLogin } from '@pages/wallet/approve-login';
import { YourSeedPhrase } from '@pages/certify/your-seed-phrase';
import { ImportPrivateKey } from '@pages/certify/import-private-key';
import { GenerateSeedPhrase } from '@pages/certify/generate-seed-phrase';
import { CreatePassword } from '@pages/certify/create-password';
import { LaunchAdena } from '@pages/certify/launch-adena';
import { WalletMain } from '@pages/wallet/wallet-main';
import { Login } from '@pages/certify/login';
import { ForgotPassword } from '@pages/certify/forgot-password';
import { EnterSeedPhrase } from '@pages/certify/enter-seed';
import { Nft } from '@pages/wallet/nft';
import { Staking } from '@pages/wallet/staking';
import { Explore } from '@pages/wallet/explore';
import { History } from '@pages/wallet/history';
import { TransactionDetail } from '@pages/wallet/transaction-detail';
import { Settings } from '@pages/certify/settings';
import { ChangePassword } from '@pages/certify/change-password';
import { ExportAccount } from '@pages/certify/export-account';
import { ViewPrivateKey } from '@pages/certify/view-private-key';
import { SeedPhrase } from '@pages/certify/seed-phrase';
import { ViewSeedPhrase } from '@pages/certify/view-seed-phrase';
import { WalletSearch } from '@pages/wallet/search';
import { Deposit } from '@pages/wallet/deposit';
import { TokenDetails } from '@pages/wallet/token-details';
import { ConnectedApps } from '@pages/certify/connected-apps';
import AddAccountPage from '@pages/certify/add-account-page/AddAccountPage';
import { ImportAccount } from '@pages/certify/import-account';
import { ApproveEstablish } from '@pages/wallet/approve-establish';
import AddressBook from '@pages/certify/address-book';
import AddAddress from '@pages/certify/add-address';
import {
  ApproveConnectHardwareWalletConnect,
  ApproveConnectHardwareWalletFinish,
  ApproveConnectHardwareWalletSelectAccount,
  ApproveHardwareWalletLedgerPassword,
  ApproveHardwareWalletLedgerAllSet,
} from '@pages/certify/approve-connect-hardware-wallet';
import { GoogleConnect, GoogleConnectFailed } from '@pages/certify/google-login/connect';
import { ApproveSign } from '@pages/wallet/approve-sign';
import { SecurityPrivacy } from '@pages/certify/security-privacy';
import { AboutAdena } from '@pages/certify/about-adena';
import { RevealPasswordPhrase } from '@pages/certify/reveal-password-phrase';
import { RevealPrivatePhrase } from '@pages/certify/reveal-private-phrase';
import { ApproachPasswordPhrase } from '@pages/certify/approach-password-phrase';
import { ApproachPrivatePhrase } from '@pages/certify/approach-private-phrase';
import { RemoveAccount } from '@pages/certify/remove-account';
import { ResetWallet } from '@pages/certify/reset-wallet';
import { ErrorContainer } from '@layouts/error-container';
import { Background } from '@components/background';
import { TabContainer } from '@layouts/tab-container';
import { ProgressMenu } from '@layouts/header/progress-menu';
import { useWalletContext } from '@hooks/use-context';
import LoadingMain from '@components/loading-screen/loading-main';
import ManageToken from '@pages/wallet/manage-token';
import TransferInput from '@pages/wallet/transfer-input';
import TransferSummary from '@pages/wallet/transfer-summary';
import ManageTokenAdded from '@pages/wallet/manage-token-added';
import TransferLedgerLoading from '@pages/wallet/transfer-ledger-loading';
import TransferLedgerReject from '@pages/wallet/transfer-ledger-reject';
import { ApproveTransactionLedgerLoading } from '@pages/wallet/approve-transaction-ledger-loading';
import { ApproveSignLedgerLoading } from '@pages/wallet/approve-sign-ledger-loading';
import AddCustomNetworkPage from '@pages/wallet/add-custom-network';
import ChangeNetwork from '@pages/certify/change-network';
import EditCustomNetworkPage from '@pages/wallet/edit-custom-network';
import ApproveChangingNetworkPage from '@pages/wallet/approve-changing-network/approve-changing-network';
import ApproveAddingNetworkPage from '@pages/wallet/approve-adding-network/approve-adding-network';
import AccountDetailsPage from '@pages/wallet/account-details';
import ApproveSignTransaction from '@pages/wallet/approve-sign-transaction/approve-sign-transaction';
import ApproveSignTransactionLedgerLoading from '@pages/wallet/approve-sign-transaction-ledger-loading/approve-sign-transaction-ledger-loading';

export const CustomRouter = (): JSX.Element => {
  const { wallet } = useWalletContext();

  return (
    <Router>
      <Background>
        <Header />
        <Routes>
          <Route path={RoutePath.Home} element={<WalletCreate />} />
          <Route path={RoutePath.YourSeedPhrase} element={<YourSeedPhrase />} />
          <Route path={RoutePath.ImportPrivateKey} element={<ImportPrivateKey />} />
          <Route path={RoutePath.GenerateSeedPhrase} element={<GenerateSeedPhrase />} />
          <Route path={RoutePath.CreatePassword} element={<CreatePassword />} />
          <Route path={RoutePath.LaunchAdena} element={<LaunchAdena />} />
          <Route
            path={RoutePath.Wallet}
            element={
              <ErrorContainer>
                <WalletMain />
              </ErrorContainer>
            }
          />
          <Route path={RoutePath.EnterSeedPhrase} element={<EnterSeedPhrase />} />
          <Route path={RoutePath.Login} element={<Login />} />
          <Route path={RoutePath.ForgotPassword} element={<ForgotPassword />} />
          <Route path={RoutePath.Nft} element={<Nft />} />
          <Route path={RoutePath.Staking} element={<Staking />} />
          <Route path={RoutePath.Explore} element={<Explore />} />
          <Route path={RoutePath.History} element={<History />} />
          <Route path={RoutePath.TransactionDetail} element={<TransactionDetail />} />
          <Route path={RoutePath.ManageToken} element={<ManageToken />} />
          <Route path={RoutePath.ManageTokenAdded} element={<ManageTokenAdded />} />
          <Route path={RoutePath.Setting} element={<Settings />} />
          <Route path={RoutePath.SettingChangePassword} element={<ChangePassword />} />
          <Route path={RoutePath.SettingExportAccount} element={<ExportAccount />} />
          <Route path={RoutePath.ViewPrivateKey} element={<ViewPrivateKey />} />
          <Route path={RoutePath.SettingSeedPhrase} element={<SeedPhrase />} />
          <Route path={RoutePath.ViewSeedPhrase} element={<ViewSeedPhrase />} />
          <Route path={RoutePath.WalletSearch} element={<WalletSearch />} />
          <Route path={RoutePath.TransferInput} element={<TransferInput />} />
          <Route path={RoutePath.TransferSummary} element={<TransferSummary />} />
          <Route path={RoutePath.TransferLedgerLoading} element={<TransferLedgerLoading />} />
          <Route path={RoutePath.TransferLedgerReject} element={<TransferLedgerReject />} />
          <Route path={RoutePath.Deposit} element={<Deposit />} />
          <Route path={RoutePath.TokenDetails} element={<TokenDetails />} />
          <Route path={RoutePath.ApproveTransaction} element={<ApproveTransactionMain />} />
          <Route
            path={RoutePath.ApproveTransactionLoading}
            element={<ApproveTransactionLedgerLoading />}
          />
          <Route path={RoutePath.ApproveSign} element={<ApproveSign />} />
          <Route path={RoutePath.ApproveSignLoading} element={<ApproveSignLedgerLoading />} />
          <Route path={RoutePath.ApproveSignTransaction} element={<ApproveSignTransaction />} />
          <Route
            path={RoutePath.ApproveSignTransactionLoading}
            element={<ApproveSignTransactionLedgerLoading />}
          />
          <Route path={RoutePath.ApproveLogin} element={<ApproveLogin />} />
          <Route path={RoutePath.ApproveEstablish} element={<ApproveEstablish />} />
          <Route path={RoutePath.ApproveChangingNetwork} element={<ApproveChangingNetworkPage />} />
          <Route path={RoutePath.ApproveAddingNetwork} element={<ApproveAddingNetworkPage />} />
          <Route path={RoutePath.ConnectedApps} element={<ConnectedApps />} />
          <Route path={RoutePath.AddCustomNetwork} element={<AddCustomNetworkPage />} />
          <Route path={RoutePath.EditCustomNetwork} element={<EditCustomNetworkPage />} />
          <Route path={RoutePath.ChangeNetwork} element={<ChangeNetwork />} />
          <Route path={RoutePath.AddAccount} element={<AddAccountPage />} />
          <Route path={RoutePath.AccountDetails} element={<AccountDetailsPage />} />
          <Route path={RoutePath.ImportAccount} element={<ImportAccount />} />
          <Route path={RoutePath.AddressBook} element={<AddressBook />} />
          <Route path={RoutePath.AddAddress} element={<AddAddress />} />
          <Route
            path={RoutePath.ApproveHardwareWalletConnect}
            element={
              <TabContainer header={<ProgressMenu showLogo progressLevel={'first'} hideArrow />}>
                <ApproveConnectHardwareWalletConnect />
              </TabContainer>
            }
          />
          <Route
            path={RoutePath.ApproveHardwareWalletSelectAccount}
            element={
              <TabContainer
                header={
                  <ProgressMenu
                    showLogo
                    progressLevel={wallet && wallet.accounts?.length > 0 ? 'second' : 'first'}
                    hideArrow
                  />
                }
              >
                <ApproveConnectHardwareWalletSelectAccount />
              </TabContainer>
            }
          />
          <Route
            path={RoutePath.ApproveHardwareWalletLedgerPassword}
            element={
              <TabContainer header={<ProgressMenu showLogo progressLevel={'second'} hideArrow />}>
                <ApproveHardwareWalletLedgerPassword />
              </TabContainer>
            }
          />
          <Route
            path={RoutePath.ApproveHardwareWalletFinish}
            element={
              <TabContainer header={<ProgressMenu showLogo progressLevel={'third'} hideArrow />}>
                <ApproveConnectHardwareWalletFinish />
              </TabContainer>
            }
          />
          <Route
            path={RoutePath.ApproveHardwareWalletLedgerAllSet}
            element={
              <TabContainer header={<ProgressMenu showLogo progressLevel={'third'} hideArrow />}>
                <ApproveHardwareWalletLedgerAllSet />
              </TabContainer>
            }
          />
          <Route path={RoutePath.SecurityPrivacy} element={<SecurityPrivacy />} />
          <Route path={RoutePath.AboutAdena} element={<AboutAdena />} />
          <Route path={RoutePath.RevealPasswordPhrase} element={<RevealPasswordPhrase />} />
          <Route path={RoutePath.RevealPrivatePhrase} element={<RevealPrivatePhrase />} />
          <Route path={RoutePath.ApproachPasswordPhrase} element={<ApproachPasswordPhrase />} />
          <Route path={RoutePath.ApproachPrivatePhrase} element={<ApproachPrivatePhrase />} />
          <Route path={RoutePath.RemoveAccount} element={<RemoveAccount />} />
          <Route path={RoutePath.ResetWallet} element={<ResetWallet />} />
          <Route path={RoutePath.GoogleConnect} element={<GoogleConnect />} />
          <Route path={RoutePath.GoogleConnectFailed} element={<GoogleConnectFailed />} />
        </Routes>
        <Navigation />
        <LoadingMain />
      </Background>
    </Router>
  );
};
