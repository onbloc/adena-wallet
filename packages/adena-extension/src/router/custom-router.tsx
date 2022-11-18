import React from 'react';
import { HashRouter as Router, Route, Routes } from 'react-router-dom';
import { RoutePath } from './path';
import { Header } from '@layouts/header';
import { Navigation } from '@layouts/navigation';
import { WalletCreate } from '@pages/wallet/wallet-create';
import { ApproveTransactionMain } from '@pages/wallet/approve-transaction-main';
import { ApproveTransactionLogin } from '@pages/wallet/approve-transaction-login';
import { YourSeedPhrase } from '@pages/certify/your-seed-phrase';
import { CreatePassword } from '@pages/certify/create-password';
import { LaunchAdena } from '@pages/certify/launch-adena';
import { WalletMain } from '@pages/wallet/wallet-main';
import { Login } from '@pages/certify/login';
import { EnterSeedPharse } from '@pages/certify/enter-seed';
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
import { GeneralSend } from '@pages/wallet/general-send';
import { SendConfirm } from '@pages/wallet/send-confirm';
import { Deposit } from '@pages/wallet/deposit';
import { TokenDetails } from '@pages/wallet/token-details';
import { ConnectedApps } from '@pages/certify/connected-apps';
import { ChangeNetwork } from '@pages/certify/change-network';
import { AddAccount } from '@pages/certify/add-account';
import { ImportAccount } from '@pages/certify/import-account';
import { ApproveEstablish } from '@pages/wallet/approve-establish';
import AddressBook from '@pages/certify/address-book';
import AddAddress from '@pages/certify/add-address';

export const CustomRouter = () => {

  return (
    <Router>
      <Header />
      <Routes>
        <Route path={RoutePath.Home} element={<WalletCreate />} />
        <Route path={RoutePath.YourSeedPhrase} element={<YourSeedPhrase />} />
        <Route path={RoutePath.CreatePassword} element={<CreatePassword />} />
        <Route path={RoutePath.LaunchAdena} element={<LaunchAdena />} />
        <Route path={RoutePath.Wallet} element={<WalletMain />} />
        <Route path={RoutePath.EnterSeedPhrase} element={<EnterSeedPharse />} />
        <Route path={RoutePath.Login} element={<Login />} />
        <Route path={RoutePath.Nft} element={<Nft />} />
        <Route path={RoutePath.Staking} element={<Staking />} />
        <Route path={RoutePath.Explore} element={<Explore />} />
        <Route path={RoutePath.History} element={<History />} />
        <Route path={RoutePath.TransactionDetail} element={<TransactionDetail />} />
        <Route path={RoutePath.Setting} element={<Settings />} />
        <Route path={RoutePath.SettingChangePassword} element={<ChangePassword />} />
        <Route path={RoutePath.SettingExportAccount} element={<ExportAccount />} />
        <Route path={RoutePath.ViewPrivateKey} element={<ViewPrivateKey />} />
        <Route path={RoutePath.SettingSeedPhrase} element={<SeedPhrase />} />
        <Route path={RoutePath.ViewSeedPhrase} element={<ViewSeedPhrase />} />
        <Route path={RoutePath.WalletSearch} element={<WalletSearch />} />
        <Route path={RoutePath.GeneralSend} element={<GeneralSend />} />
        <Route path={RoutePath.SendConfirm} element={<SendConfirm />} />
        <Route path={RoutePath.Deposit} element={<Deposit />} />
        <Route path={RoutePath.TokenDetails} element={<TokenDetails />} />
        <Route path={RoutePath.ApproveTransaction} element={<ApproveTransactionMain />} />
        <Route path={RoutePath.ApproveTransactionLogin} element={<ApproveTransactionLogin />} />
        <Route path={RoutePath.ApproveEstablish} element={<ApproveEstablish />} />
        <Route path={RoutePath.ConnectedApps} element={<ConnectedApps />} />
        <Route path={RoutePath.ChangeNetwork} element={<ChangeNetwork />} />
        <Route path={RoutePath.AddAccount} element={<AddAccount />} />
        <Route path={RoutePath.ImportAccount} element={<ImportAccount />} />
        <Route path={RoutePath.AddressBook} element={<AddressBook />} />
        <Route path={RoutePath.AddAddress} element={<AddAddress />} />
      </Routes>
      <Navigation />
    </Router>
  );
};
