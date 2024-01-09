import { InjectionMessage } from '@inject/message';
import { AddressBookItem } from '@repositories/wallet';
import { CreateAccountState, TokenBalanceType, TokenModel, TransactionInfo } from '@types';
import { StdSignDoc } from 'adena-module';

export enum RoutePath {
  Home = '/',
  Login = '/login',
  Nft = '/nft',
  Staking = '/staking',
  Explore = '/explore',
  History = '/history',
  Create = '/create',
  ForgotPassword = '/login/forgot-password',

  //phrase
  EnterSeedPhrase = '/popup/enter-seed',
  CreatePassword = '/popup/create-password',
  LaunchAdena = '/popup/launch-adena',
  YourSeedPhrase = '/popup/your-seed-phrase',
  ImportPrivateKey = '/popup/import-private-key',
  GenerateSeedPhrase = '/popup/generate-seed-phrase',

  //google login
  GoogleConnect = '/google-login',
  GoogleConnectFailed = '/google-login/failed',

  //wallet
  Wallet = '/wallet',
  WalletSearch = '/wallet/search',
  TransactionDetail = '/wallet/transaction-detail',
  Deposit = '/wallet/deposit',
  Send = '/wallet/send',
  TokenDetails = '/wallet/token-details',
  ApproveLogin = '/approve/wallet/login',
  ApproveTransaction = '/approve/wallet/transaction',
  ApproveTransactionLoading = '/approve/wallet/transaction/loading',
  ApproveSign = '/approve/wallet/sign',
  ApproveSignLoading = '/approve/wallet/sign/loading',
  ApproveSignTransaction = '/approve/wallet/sign-tx',
  ApproveEstablish = '/approve/wallet/establish',
  ApproveChangingNetwork = '/approve/wallet/network/change',
  ApproveAddingNetwork = '/approve/wallet/network/add',
  ImportAccount = '/wallet/import-account',
  AddAccount = '/wallet/add-account',
  AccountDetails = '/wallet/accounts/:accountId',
  ManageToken = '/wallet/manage-token',
  ManageTokenAdded = '/wallet/manage-token/added',
  TransferInput = '/wallet/transfer-input',
  TransferSummary = '/wallet/transfer-summary',
  TransferLedgerLoading = '/wallet/transfer-ledger/loading',
  TransferLedgerReject = '/wallet/transfer-ledger/reject',

  // settings
  Setting = '/settings',
  SettingChangePassword = '/settings/change-password',
  SettingSeedPhrase = '/settings/seed-phrase',
  ViewPrivateKey = '/settings/view-private-key',
  ViewSeedPhrase = '/settings/view-seed-phrase',
  ConnectedApps = '/settings/connected-apps',
  ChangeNetwork = '/settings/change-network',
  AddCustomNetwork = '/settings/change-network/add',
  EditCustomNetwork = '/settings/change-network/edit',
  AddressBook = '/settings/address-book',
  AddAddress = '/settings/add-address',
  SecurityPrivacy = '/settings/security-privacy',
  RevealPasswordPhrase = '/settings/security-privacy/reveal-password-phrase',
  RevealPrivatePhrase = '/settings/security-privacy/reveal-private-phrase',
  AboutAdena = '/settings/about-adena',
  ExportPrivateKey = '/settings/security-privacy/export-private-key',
  RemoveAccount = '/settings/security-privacy/remove-account',
  ResetWallet = '/settings/security-privacy/reset-wallet',
  ApproveHardwareWalletConnect = '/approve/settings/hardware-wallet',
  ApproveHardwareWalletSelectAccount = '/approve/settings/hardware-wallet/select-account',
  ApproveHardwareWalletFinish = '/approve/settings/hardware-wallet/finish',
  ApproveHardwareWalletLedgerPassword = '/approve/settings/hardware-wallet/ledger-password',
  ApproveHardwareWalletLedgerAllSet = '/approve/settings/hardware-wallet/ledger-all-set',
}

export type RouteParams = {
  [RoutePath.Home]: null;
  [RoutePath.Login]: null;
  [RoutePath.Nft]: null;
  [RoutePath.Staking]: null;
  [RoutePath.Explore]: null;
  [RoutePath.History]: null;
  [RoutePath.Create]: null;
  [RoutePath.ForgotPassword]: null;

  //phrase
  [RoutePath.EnterSeedPhrase]: {
    from: 'forgot-password' | 'wallet-create';
  } | null;
  [RoutePath.CreatePassword]: CreateAccountState;
  [RoutePath.LaunchAdena]: CreateAccountState;
  [RoutePath.YourSeedPhrase]: { type: 'ADD_ACCOUNT' } | null;
  [RoutePath.ImportPrivateKey]: null;
  [RoutePath.GenerateSeedPhrase]: null;

  //google login
  [RoutePath.GoogleConnect]: null;
  [RoutePath.GoogleConnectFailed]: null;

  //wallet
  [RoutePath.Wallet]: null;
  [RoutePath.WalletSearch]: {
    type: 'deposit' | 'send';
  };
  [RoutePath.TransactionDetail]: {
    transactionInfo: TransactionInfo;
  };
  [RoutePath.Deposit]: {
    type: 'token' | 'wallet';
    tokenMetainfo: TokenBalanceType;
  };
  [RoutePath.Send]: null;
  [RoutePath.TokenDetails]: {
    tokenBalance: TokenBalanceType;
  };
  [RoutePath.ApproveLogin]: null;
  [RoutePath.ApproveTransaction]: null;
  [RoutePath.ApproveTransactionLoading]: {
    document?: StdSignDoc;
    requestData?: InjectionMessage;
  };
  [RoutePath.ApproveSign]: null;
  [RoutePath.ApproveSignLoading]: {
    document?: StdSignDoc;
    requestData?: InjectionMessage;
  };
  [RoutePath.ApproveSignTransaction]: null;
  [RoutePath.ApproveEstablish]: null;
  [RoutePath.ApproveChangingNetwork]: null;
  [RoutePath.ApproveAddingNetwork]: null;
  [RoutePath.ImportAccount]: null;
  [RoutePath.AddAccount]: null;
  [RoutePath.AccountDetails]: null;
  [RoutePath.ManageToken]: null;
  [RoutePath.ManageTokenAdded]: null;
  [RoutePath.TransferInput]: {
    tokenBalance: TokenBalanceType;
    isTokenSearch?: boolean;
  };
  [RoutePath.TransferSummary]: {
    isTokenSearch: boolean;
    tokenMetainfo: TokenModel;
    toAddress: string;
    transferAmount: {
      value: string;
      denom: string;
    };
    networkFee: {
      value: string;
      denom: string;
    };
  };
  [RoutePath.TransferLedgerLoading]: {
    document: StdSignDoc;
  };
  [RoutePath.TransferLedgerReject]: null;

  [RoutePath.Setting]: null;
  [RoutePath.SettingChangePassword]: null;
  [RoutePath.SettingSeedPhrase]: null;
  [RoutePath.ViewPrivateKey]: null;
  [RoutePath.ViewSeedPhrase]: { mnemonic: string };
  [RoutePath.ConnectedApps]: null;
  [RoutePath.ChangeNetwork]: null;
  [RoutePath.AddCustomNetwork]: null;
  [RoutePath.EditCustomNetwork]: {
    networkId: string;
  };
  [RoutePath.AddressBook]: null;
  [RoutePath.AddAddress]: {
    status: 'add' | 'edit';
    curr?: AddressBookItem;
    addressList: AddressBookItem[];
  };
  [RoutePath.SecurityPrivacy]: null;
  [RoutePath.RevealPasswordPhrase]: null;
  [RoutePath.RevealPrivatePhrase]: null;
  [RoutePath.AboutAdena]: null;
  [RoutePath.ExportPrivateKey]: {
    accountId?: string;
  } | null;
  [RoutePath.RemoveAccount]: null;
  [RoutePath.ResetWallet]: {
    from: 'forgot-password';
  } | null;
  [RoutePath.ApproveHardwareWalletConnect]: null;
  [RoutePath.ApproveHardwareWalletSelectAccount]: {
    accounts: string[];
  };
  [RoutePath.ApproveHardwareWalletFinish]: {
    accounts: string[];
  };
  [RoutePath.ApproveHardwareWalletLedgerPassword]: {
    accounts: string[];
  };
  [RoutePath.ApproveHardwareWalletLedgerAllSet]: null;
};
