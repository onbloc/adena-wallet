import { InjectionMessage } from '@inject/message';
import { AddressBookItem } from '@repositories/wallet';
import { CreateAccountState, TokenBalanceType, TokenModel, TransactionInfo } from '@types';
import { Document } from 'adena-module';

export const WEB_BASE_PATH = 'register.html#' as const;

export enum RoutePath {
  Home = '/',
  Login = '/login',
  Nft = '/nft',
  Staking = '/staking',
  Explore = '/explore',
  History = '/history',
  Create = '/create',
  ForgotPassword = '/login/forgot-password',
  EnterSeedPhrase = '/popup/enter-seed',
  CreatePassword = '/popup/create-password',
  LaunchAdena = '/popup/launch-adena',

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
  ApproveSignTransactionLoading = '/approve/wallet/sign-tx/loading',
  ApproveEstablish = '/approve/wallet/establish',
  ApproveChangingNetwork = '/approve/wallet/network/change',
  ApproveAddingNetwork = '/approve/wallet/network/add',
  ImportAccount = '/wallet/import-account',
  AccountDetails = '/wallet/accounts/:accountId',
  ManageToken = '/wallet/manage-token',
  ManageTokenAdded = '/wallet/manage-token/added',
  TransferInput = '/wallet/transfer-input',
  TransferSummary = '/wallet/transfer-summary',
  TransferLedgerLoading = '/wallet/transfer-ledger/loading',
  TransferLedgerReject = '/wallet/transfer-ledger/reject',
  BroadcastTransaction = '/wallet/broadcast-transaction',

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
  AboutAdena = '/settings/about-adena',
  RemoveAccount = '/settings/security-privacy/remove-account',
  ResetWallet = '/settings/security-privacy/reset-wallet',

  // web
  WebConnectLedger = '/web/connect-ledger',
  WebConnectLedgerSelectAccount = '/web/connect-ledger/select-account',
  WebAdvancedOption = '/web/option',
  WebCreatePassword = '/web/create-password',
  WebGoogleLogin = '/web/google-login',
  WebSetupAirgap = '/web/airgap',
  WebWalletCreate = '/web/wallet-create',
  WebWalletImport = '/web/wallet-import',
  WebWalletExport = '/web/wallet-export',
  WebWalletAllSet = '/web/all-set',
  WebAccountAddedComplete = '/web/account-added',
  WebQuestionnaire = '/web/questionnaire',
  WebAccountAdd = '/web/account-add',
  WebAccountImport = '/web/account-import',
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
  [RoutePath.EnterSeedPhrase]: {
    from: 'forgot-password' | 'wallet-create';
  } | null;
  [RoutePath.CreatePassword]: CreateAccountState;
  [RoutePath.LaunchAdena]: CreateAccountState;

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
    document?: Document;
    requestData?: InjectionMessage;
  };
  [RoutePath.ApproveSign]: null;
  [RoutePath.ApproveSignLoading]: {
    document?: Document;
    requestData?: InjectionMessage;
  };
  [RoutePath.ApproveSignTransaction]: null;
  [RoutePath.ApproveSignTransactionLoading]: {
    document?: Document;
    requestData?: InjectionMessage;
  };
  [RoutePath.ApproveEstablish]: null;
  [RoutePath.ApproveChangingNetwork]: null;
  [RoutePath.ApproveAddingNetwork]: null;
  [RoutePath.ImportAccount]: null;
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
    document: Document;
  };
  [RoutePath.TransferLedgerReject]: null;
  [RoutePath.BroadcastTransaction]: null;

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
  [RoutePath.AboutAdena]: null;
  [RoutePath.RemoveAccount]: null;
  [RoutePath.ResetWallet]: {
    from: 'forgot-password';
  } | null;
  [RoutePath.WebConnectLedger]: null;
  [RoutePath.WebConnectLedgerSelectAccount]: {
    accounts: string[];
  };

  [RoutePath.WebConnectLedger]: null;
  [RoutePath.WebAdvancedOption]: null;
  [RoutePath.WebCreatePassword]: {
    serializedWallet: string;
    stepLength: number;
  };
  [RoutePath.WebGoogleLogin]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebSetupAirgap]: null;
  [RoutePath.WebWalletCreate]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebAccountAdd]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebAccountImport]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebWalletImport]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebWalletExport]: {
    doneQuestionnaire: boolean;
  } | null;
  [RoutePath.WebWalletAllSet]: null;
  [RoutePath.WebAccountAddedComplete]: null;
  [RoutePath.WebQuestionnaire]: {
    callbackPath:
      | RoutePath.WebWalletCreate
      | RoutePath.WebGoogleLogin
      | RoutePath.WebAccountAdd
      | RoutePath.WebWalletExport
      | RoutePath.WebWalletImport
      | RoutePath.WebAccountImport;
  };
};
