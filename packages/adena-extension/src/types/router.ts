import { InjectionMessage } from '@inject/message';
import { AddressBookItem } from '@repositories/wallet';
import {
  CreateAccountState,
  GasInfo,
  GRC721CollectionModel,
  GRC721Model,
  TokenBalanceType,
  TokenModel,
  TransactionInfo,
} from '@types';
import { Document } from 'adena-module';

export const REGISTER_PATH = 'register.html' as const;
export const SECURITY_PATH = 'security.html' as const;

export enum RoutePath {
  Home = '/',
  Login = '/login',
  Nft = '/nft',
  NftCollection = '/nft/collection',
  NftCollectionAsset = '/nft/collection/assets',
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
  WalletAccountInitialization = '/wallet/account-initialization',
  WalletSearch = '/wallet/search',
  TransactionDetail = '/wallet/transaction-detail',
  Deposit = '/wallet/deposit',
  Send = '/wallet/send',
  TokenDetails = '/wallet/token-details',
  ApproveLogin = '/approve/wallet/login',
  ApproveSignFailed = '/approve/wallet/sign-failed',
  ApproveTransaction = '/approve/wallet/transaction',
  ApproveTransactionLoading = '/approve/wallet/transaction/loading',
  ApproveSign = '/approve/wallet/sign',
  ApproveSignLoading = '/approve/wallet/sign/loading',
  ApproveSignTransaction = '/approve/wallet/sign-tx',
  ApproveSignTransactionLoading = '/approve/wallet/sign-tx/loading',
  ApproveEstablish = '/approve/wallet/establish',
  ApproveChangingNetwork = '/approve/wallet/network/change',
  ApproveAddingNetwork = '/approve/wallet/network/add',
  AccountDetails = '/wallet/accounts/:accountId',
  ManageToken = '/wallet/manage-token',
  ManageNft = '/wallet/manage-nft',
  ManageTokenAdded = '/wallet/manage-token/added',
  NftTransferInput = '/wallet/nft-transfer-input',
  TransferInput = '/wallet/transfer-input',
  TransferSummary = '/wallet/transfer-summary',
  NftTransferSummary = '/wallet/nft-transfer-summary',
  TransferLedgerLoading = '/wallet/transfer-ledger/loading',
  TransferLedgerReject = '/wallet/transfer-ledger/reject',
  BroadcastTransaction = '/wallet/broadcast-transaction',

  // settings
  Setting = '/settings',
  SettingChangePassword = '/settings/change-password',
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
  WebNotFound = '/web/not-found',
  WebSelectHardWallet = '/web/select-hard-wallet',
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
  [RoutePath.NftCollection]: {
    collection: GRC721CollectionModel;
  };
  [RoutePath.WalletAccountInitialization]: null;
  [RoutePath.NftCollectionAsset]: {
    collectionAsset: GRC721Model;
  };
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
    token: {
      symbol: string;
    };
  };
  [RoutePath.Send]: null;
  [RoutePath.TokenDetails]: {
    tokenBalance: TokenBalanceType;
  };
  [RoutePath.ApproveLogin]: null;
  [RoutePath.ApproveSignFailed]: null;
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
  [RoutePath.AccountDetails]: null;
  [RoutePath.ManageToken]: null;
  [RoutePath.ManageTokenAdded]: null;
  [RoutePath.ManageNft]: null;
  [RoutePath.NftTransferInput]: {
    collectionAsset: GRC721Model;
  };
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
    gasInfo: GasInfo | null;
    memo: string;
  };
  [RoutePath.NftTransferSummary]: {
    grc721Token: GRC721Model;
    toAddress: string;
    networkFee: {
      value: string;
      denom: string;
    };
    memo: string;
  };
  [RoutePath.TransferLedgerLoading]: {
    document: Document;
  };
  [RoutePath.TransferLedgerReject]: null;
  [RoutePath.BroadcastTransaction]: null;

  [RoutePath.Setting]: null;
  [RoutePath.SettingChangePassword]: null;
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

  [RoutePath.WebNotFound]: null;
  [RoutePath.WebConnectLedger]: null;
  [RoutePath.WebConnectLedgerSelectAccount]: {
    accounts: string[];
  };

  [RoutePath.WebSelectHardWallet]: null;
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
