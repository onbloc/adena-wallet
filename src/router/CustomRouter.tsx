import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { RoutePath } from './path';
import { Header } from '@ui/common/Header';
import { Navigation } from '@ui/common/Navigation';
import WalletCreatePage from '@pages/Wallet/Create';
import ApproveTransactionPage from '@pages/Wallet/ApproveTransaction';
import ApproveTransactionLoginPage from '@pages/Wallet/ApproveTransactionLogin';
import YourSeedPhrasePage from '@pages/SideBar/Phrase/YourSeedPhrase';
import CreatePasswordPage from '@pages/SideBar/Phrase/CreatePassword';
import LaunchAdenaPage from '@pages/SideBar/Phrase/LaunchAdena';
import WalletPage from '@pages/Wallet/Default';
import LoginPage from '@pages/Login';
import EnterSeedPhrasePage from '@pages/SideBar/Phrase/EnterSeed';
import NftCollectionPage from '@pages/Wallet/Nft';
import StakingPage from '@pages/Wallet/Staking';
import ExplorePage from '@pages/Wallet/Explore';
import HistoryPage from '@pages/Wallet/History';
import TransactionDetailPage from '@pages/Wallet/TransactionDetail';
import SettingAddAccountPage from '@pages/Settings/Default';
import SettingChangePasswordPage from '@pages/Settings/ChangePassword';
import SettingExportAccountPage from '@pages/Settings/ExportAccount';
import ViewPrivateKeyPage from '@pages/Settings/ViewPrivateKey';
import SettingSeedPhrasePage from '@pages/Settings/SeedPhrase';
import ViewSeedPhrasePage from '@pages/Settings/ViewSeedPhrase';
import WalletSearchPage from '@pages/Wallet/Search';
import GeneralSendPage from '@pages/Wallet/GeneralSend';
import SendConfirmPage from '@pages/Wallet/SendConfirm';
import DepositPage from '@pages/Wallet/Deposit';
import TokenDetailsPage from '@pages/Wallet/TokenDetails';
// import LoadingDefaultWallet from "@ui/domains/LoadingScreen/LoadingDefaultWallet";
// import LoadingApproveTransaction from "@ui/domains/LoadingScreen/LoadingApproveTransaction";

// import SideBarAddAccountPage from "@pages/SideBar/AddAccount";
// import SideBarImportAccountPage from "@pages/SideBar/ImportAccount";
// import CreatePasswordPage from "@pages/SideBar/Phrase/CreatePassword";

// import SendPage from "@pages/Wallet/Send";
// import DetailDepositPage from "@pages/Wallet/Popup/Deposit";
// import DetailSendPage from "@pages/Wallet/Popup/Send";
// import DetailSendConfirmPage from "@pages/Wallet/Popup/SendConfirm";
// import SendTypePage from "@pages/Wallet/SendType";
// import LinkSendPage from "@pages/Wallet/LinkSend";
// import LinkSendConfirmPage from "@pages/Wallet/LinkSendConfirm";
// import SendSuccessPage from "@pages/Wallet/Loading/Success";
// import SendFailedPage from "@pages/Wallet/Loading/Failed";
// import SendPendingPage from "@pages/Wallet/Loading/Pending";
// import ManageTokenPage from "@pages/Wallet/ManageToken";
// import AddCustomPage from "@pages/Wallet/AddCustom";
// import DepositNftPage from "@pages/Wallet/Nft/DepositNft";
// import OneNftPage from "@pages/Wallet/Nft/CollectiveNft/OneNft";
// import CollectiveNftPage from "@pages/Wallet/Nft/CollectiveNft";
// import AddDelegationPage from "@pages/Wallet/Staking/AddDelegation";
// import ManagePage from "@pages/Wallet/Staking/Manage";
// import ClaimingPage from "@pages/Wallet/Staking/Claiming";
// import MyDelegationPage from "@pages/Wallet/Staking/MyDelegation";
// import MyDelegationsPage from "@pages/Wallet/Staking/MyDelegations";
// import DelegatePage from "@pages/Wallet/Staking/Delegate";
// import UndelegatePage from "@pages/Wallet/Staking/Undelegate";
// import RedelegatePage from "@pages/Wallet/Staking/Redelegate";
// import RedelegatingPage from "@pages/Wallet/Staking/Redelegating";
// import SelectValidatorPage from "@pages/Wallet/Staking/SelectValidator";
// import DelegatingPage from "@pages/Wallet/Staking/Delegating";
// import UndelegatingPage from "@pages/Wallet/Staking/Undelegating";
// import LoadingScreenPage from "@pages/Wallet/Staking/LoadingScreen";
// import ConnectedAppsPage from "@pages/Settings/ConnectedApps";
// import AddressBookPage from "@pages/Settings/AddressBook";
// import ChangeNetworkPage from "@pages/Settings/ChangeNetwork";
// import AddAddressPage from "@pages/Settings/AddAddress";
// import EditAddressPage from "@pages/Settings/EditAddress";
// import ConnectPage from "@pages/Wallet/Connect";
// import NftGeneralSendPage from "@pages/Wallet/Nft/NftGeneralSend";
// import NftLinkSendPage from "@pages/Wallet/Nft/NftLinkSend";
// import NftSendConfirmPage from "@pages/Wallet/Nft/NftSendConfirm";

export const CustomRouter = () => (
  <Router>
    <Header />
    <Routes>
      <Route path={'/'} element={<WalletCreatePage />} />
      <Route path={RoutePath.YourSeedPhrase} element={<YourSeedPhrasePage />} />
      <Route path={RoutePath.CreatePassword} element={<CreatePasswordPage />} />
      <Route path={RoutePath.LaunchAdena} element={<LaunchAdenaPage />} />
      <Route path={RoutePath.Wallet} element={<WalletPage />} />
      <Route path={RoutePath.EnterSeedPhrase} element={<EnterSeedPhrasePage />} />
      <Route path={RoutePath.Login} element={<LoginPage />} />
      <Route path={RoutePath.Nft} element={<NftCollectionPage />} />
      <Route path={RoutePath.Staking} element={<StakingPage />} />
      <Route path={RoutePath.Explore} element={<ExplorePage />} />
      <Route path={RoutePath.History} element={<HistoryPage />} />
      <Route path={RoutePath.TransactionDetail} element={<TransactionDetailPage />} />
      <Route path={RoutePath.Setting} element={<SettingAddAccountPage />} />
      <Route path={RoutePath.SettingChangePassword} element={<SettingChangePasswordPage />} />
      <Route path={RoutePath.SettingExportAccount} element={<SettingExportAccountPage />} />
      <Route path={RoutePath.ViewPrivateKey} element={<ViewPrivateKeyPage />} />
      <Route path={RoutePath.SettingSeedPhrase} element={<SettingSeedPhrasePage />} />
      <Route path={RoutePath.ViewSeedPhrase} element={<ViewSeedPhrasePage />} />
      <Route path={RoutePath.WalletSearch} element={<WalletSearchPage />} />
      <Route path={RoutePath.GeneralSend} element={<GeneralSendPage />} />
      <Route path={RoutePath.SendConfirm} element={<SendConfirmPage />} />
      <Route path={RoutePath.Deposit} element={<DepositPage />} />
      <Route path={RoutePath.TokenDetails} element={<TokenDetailsPage />} />
      <Route path={RoutePath.ApproveTransaction} element={<ApproveTransactionPage />} />
      <Route path={RoutePath.ApproveTransactionLogin} element={<ApproveTransactionLoginPage />} />
      {/* 
      
      <Route
        path={RoutePath.SideBarAddAccount}
        element={<SideBarAddAccountPage />}
      />
      <Route
        path={RoutePath.SideBarImportAccount}
        element={<SideBarImportAccountPage />}
      />
      <Route path={RoutePath.Send} element={<SendPage />} />
      <Route path={RoutePath.SendType} element={<SendTypePage />} />
      <Route path={RoutePath.LinkSend} element={<LinkSendPage />} />
      <Route
        path={RoutePath.LinkSendConfirm}
        element={<LinkSendConfirmPage />}
      />
      <Route path={RoutePath.Nft} element={<NftCollectionPage />} />
      <Route path={RoutePath.ManageToken} element={<ManageTokenPage />} />
      <Route path={RoutePath.AddCustomToken} element={<AddCustomPage />} />
      <Route path={RoutePath.DetailDeposit} element={<DetailDepositPage />} />
      <Route path={RoutePath.DetailSend} element={<DetailSendPage />} />
      <Route path={RoutePath.SendSuccess} element={<SendSuccessPage />} />
      <Route path={RoutePath.SendFailed} element={<SendFailedPage />} />
      <Route path={RoutePath.SendPending} element={<SendPendingPage />} />

      <Route path={RoutePath.AddDelegation} element={<AddDelegationPage />} />
      <Route path={RoutePath.StakingManage} element={<ManagePage />} />
      <Route path={RoutePath.StakingClaiming} element={<ClaimingPage />} />
      <Route path={RoutePath.MyDelegation} element={<MyDelegationPage />} />
      <Route path={RoutePath.MyDelegations} element={<MyDelegationsPage />} />
      <Route path={RoutePath.Delegate} element={<DelegatePage />} />
      <Route path={RoutePath.Delegating} element={<DelegatingPage />} />
      <Route path={RoutePath.Undelegate} element={<UndelegatePage />} />
      <Route path={RoutePath.Undelegating} element={<UndelegatingPage />} />
      <Route path={RoutePath.Redelegate} element={<RedelegatePage />} />
      <Route path={RoutePath.Redelegating} element={<RedelegatingPage />} />
      <Route path={RoutePath.LoadingScreen} element={<LoadingScreenPage />} />
      <Route path={RoutePath.NftGeneralSend} element={<NftGeneralSendPage />} />
      <Route path={RoutePath.NftLinkSend} element={<NftLinkSendPage />} />
      <Route path={RoutePath.NftSendConfirm} element={<NftSendConfirmPage />} />

      <Route path={RoutePath.ConnectedApps} element={<ConnectedAppsPage />} />
      <Route path={RoutePath.AddressBook} element={<AddressBookPage />} />
      <Route path={RoutePath.ChangeNetwork} element={<ChangeNetworkPage />} />
      <Route path={RoutePath.AddAddress} element={<AddAddressPage />} />
      <Route path={RoutePath.EditAddress} element={<EditAddressPage />} />

      <Route path={RoutePath.Connect} element={<ConnectPage />} />

      <Route
        path={RoutePath.SelectValidatior}
        element={<SelectValidatorPage />}
      />

      <Route path={RoutePath.DepositNft} element={<DepositNftPage />} />
      <Route path={RoutePath.OneNft} element={<OneNftPage />} />
      <Route path={RoutePath.CollectiveNft} element={<CollectiveNftPage />} />

      <Route
        path={RoutePath.DetailSendConfirm}
        element={<DetailSendConfirmPage />}
      /> */}
    </Routes>
    <Navigation />
  </Router>
);
