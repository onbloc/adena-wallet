import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { RoutePath } from '../../types/router';

import { AboutAdena } from '@pages/popup/certify/about-adena';
import AddAddress from '@pages/popup/certify/add-address';
import AddressBook from '@pages/popup/certify/address-book';
import ChangeNetwork from '@pages/popup/certify/change-network';
import { ChangePassword } from '@pages/popup/certify/change-password';
import { ConnectedApps } from '@pages/popup/certify/connected-apps';
import { EnterSeedPhrase } from '@pages/popup/certify/enter-seed';
import { ForgotPassword } from '@pages/popup/certify/forgot-password';
import { Login } from '@pages/popup/certify/login';
import { RemoveAccount } from '@pages/popup/certify/remove-account';
import { ResetWallet } from '@pages/popup/certify/reset-wallet';
import { SecurityPrivacy } from '@pages/popup/certify/security-privacy';
import { Settings } from '@pages/popup/certify/settings';

import AccountDetailsPage from '@pages/popup/wallet/account-details';
import AddCustomNetworkPage from '@pages/popup/wallet/add-custom-network';
import ApproveAddingNetworkPage from '@pages/popup/wallet/approve-adding-network';
import ApproveChangingNetworkPage from '@pages/popup/wallet/approve-changing-network';
import ApproveEstablish from '@pages/popup/wallet/approve-establish';
import { ApproveLogin } from '@pages/popup/wallet/approve-login';
import ApproveSign from '@pages/popup/wallet/approve-sign';
import ApproveSignLedgerLoading from '@pages/popup/wallet/approve-sign-ledger-loading';
import ApproveSignTransaction from '@pages/popup/wallet/approve-sign-transaction';
import ApproveSignTransactionLedgerLoading from '@pages/popup/wallet/approve-sign-transaction-ledger-loading';
import CreateMultisigAccountContainer from '@pages/popup/wallet/create-multisig-account';
import CreateMultisigTransactionContainer from '@pages/popup/wallet/create-multisig-transaction';
import SignMultisigTransactionContainer from '@pages/popup/wallet/sign-multisig-transaction';
import BroadcastMultisigTransactionScreen from '@pages/popup/wallet/broadcast-multisig-transaction-screen';
import ApproveTransactionLedgerLoading from '@pages/popup/wallet/approve-transaction-ledger-loading';
import ApproveTransactionMain from '@pages/popup/wallet/approve-transaction-main';
import BroadcastTransactionScreen from '@pages/popup/wallet/broadcast-transaction-screen';
import { Deposit } from '@pages/popup/wallet/deposit';
import EditCustomNetworkPage from '@pages/popup/wallet/edit-custom-network';
import { Explore } from '@pages/popup/wallet/explore';
import History from '@pages/popup/wallet/history';
import ManageToken from '@pages/popup/wallet/manage-token';
import ManageTokenAdded from '@pages/popup/wallet/manage-token-added';
import { Nft } from '@pages/popup/wallet/nft';
import { WalletSearch } from '@pages/popup/wallet/search';
import { Staking } from '@pages/popup/wallet/staking';
import { TokenDetails } from '@pages/popup/wallet/token-details';
import { TransactionDetail } from '@pages/popup/wallet/transaction-detail';
import TransferInput from '@pages/popup/wallet/transfer-input';
import TransferLedgerLoading from '@pages/popup/wallet/transfer-ledger-loading';
import TransferLedgerReject from '@pages/popup/wallet/transfer-ledger-reject';
import TransferSummary from '@pages/popup/wallet/transfer-summary';
import { WalletMain } from '@pages/popup/wallet/wallet-main';

import { ErrorContainer } from '@components/molecules';

import { useNetwork } from '@hooks/use-network';
import { CreatePassword } from '@pages/popup/certify/create-password';
import { LaunchAdena } from '@pages/popup/certify/launch-adena';
import AccountInitializationPage from '@pages/popup/wallet/account-initialization';
import ApproveSignFailedScreen from '@pages/popup/wallet/approve-sign-failed-screen';
import ManageNFT from '@pages/popup/wallet/manage-nft';
import NFTTransferInput from '@pages/popup/wallet/nft-transfer-input';
import NFTTransferSummary from '@pages/popup/wallet/nft-transfer-summary';
import { NftCollection } from '@pages/popup/wallet/nft/collection';
import { NftCollectionAsset } from '@pages/popup/wallet/nft/collection-asset';
import { Header } from './header';
import LoadingMain from './loading-main';
import { Navigation } from './navigation';
import ToastContainer from './toast-container';

export const PopupRouter = (): JSX.Element => {
  const { failedNetwork } = useNetwork();

  return (
    <React.Fragment>
      <Header />
      <Routes>
        <Route path={RoutePath.Home} element={<Navigate replace to={RoutePath.Wallet} />} />
        <Route
          path={RoutePath.Wallet}
          element={
            <ErrorContainer failedNetwork={failedNetwork}>
              <WalletMain />
            </ErrorContainer>
          }
        />
        <Route path={RoutePath.EnterSeedPhrase} element={<EnterSeedPhrase />} />
        <Route path={RoutePath.Login} element={<Login />} />
        <Route path={RoutePath.ForgotPassword} element={<ForgotPassword />} />
        <Route path={RoutePath.CreatePassword} element={<CreatePassword />} />
        <Route path={RoutePath.LaunchAdena} element={<LaunchAdena />} />

        <Route path={RoutePath.Nft} element={<Nft />} />
        <Route path={RoutePath.NftCollection} element={<NftCollection />} />
        <Route path={RoutePath.NftCollectionAsset} element={<NftCollectionAsset />} />
        <Route path={RoutePath.Staking} element={<Staking />} />
        <Route path={RoutePath.Explore} element={<Explore />} />
        <Route path={RoutePath.History} element={<History />} />
        <Route path={RoutePath.TransactionDetail} element={<TransactionDetail />} />
        <Route path={RoutePath.ManageToken} element={<ManageToken />} />
        <Route path={RoutePath.ManageNft} element={<ManageNFT />} />
        <Route path={RoutePath.ManageTokenAdded} element={<ManageTokenAdded />} />
        <Route path={RoutePath.Setting} element={<Settings />} />
        <Route path={RoutePath.SettingChangePassword} element={<ChangePassword />} />
        <Route
          path={RoutePath.WalletAccountInitialization}
          element={<AccountInitializationPage />}
        />
        <Route path={RoutePath.WalletSearch} element={<WalletSearch />} />
        <Route path={RoutePath.TransferInput} element={<TransferInput />} />
        <Route path={RoutePath.TransferSummary} element={<TransferSummary />} />
        <Route path={RoutePath.NftTransferSummary} element={<NFTTransferSummary />} />
        <Route path={RoutePath.NftTransferInput} element={<NFTTransferInput />} />
        <Route path={RoutePath.TransferLedgerLoading} element={<TransferLedgerLoading />} />
        <Route path={RoutePath.TransferLedgerReject} element={<TransferLedgerReject />} />
        <Route path={RoutePath.BroadcastTransaction} element={<BroadcastTransactionScreen />} />
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
        <Route path={RoutePath.ApproveSignFailed} element={<ApproveSignFailedScreen />} />
        <Route
          path={RoutePath.CreateMultisigAccount}
          element={<CreateMultisigAccountContainer />}
        />
        <Route
          path={RoutePath.CreateMultisigTransaction}
          element={<CreateMultisigTransactionContainer />}
        />
        <Route
          path={RoutePath.SignMultisigDocument}
          element={<SignMultisigTransactionContainer />}
        />
        <Route
          path={RoutePath.BroadcastMultisigTransaction}
          element={<BroadcastMultisigTransactionScreen />}
        />
        <Route path={RoutePath.ApproveLogin} element={<ApproveLogin />} />
        <Route path={RoutePath.ApproveEstablish} element={<ApproveEstablish />} />
        <Route path={RoutePath.ApproveChangingNetwork} element={<ApproveChangingNetworkPage />} />
        <Route path={RoutePath.ApproveAddingNetwork} element={<ApproveAddingNetworkPage />} />
        <Route path={RoutePath.ConnectedApps} element={<ConnectedApps />} />
        <Route path={RoutePath.AddCustomNetwork} element={<AddCustomNetworkPage />} />
        <Route path={RoutePath.EditCustomNetwork} element={<EditCustomNetworkPage />} />
        <Route path={RoutePath.ChangeNetwork} element={<ChangeNetwork />} />
        <Route path={RoutePath.AccountDetails} element={<AccountDetailsPage />} />
        <Route path={RoutePath.AddressBook} element={<AddressBook />} />
        <Route path={RoutePath.AddAddress} element={<AddAddress />} />
        <Route path={RoutePath.SecurityPrivacy} element={<SecurityPrivacy />} />
        <Route path={RoutePath.AboutAdena} element={<AboutAdena />} />
        <Route path={RoutePath.RemoveAccount} element={<RemoveAccount />} />
        <Route path={RoutePath.ResetWallet} element={<ResetWallet />} />
      </Routes>
      <Navigation />
      <LoadingMain />
      <ToastContainer />
    </React.Fragment>
  );
};
