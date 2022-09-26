export enum RoutePath {
  Home = '/',
  Login = '/login',
  Nft = '/nft',
  Staking = '/staking',
  Explore = '/explore',
  History = '/history',
  Create = '/create',

  //phrase
  EnterSeedPhrase = '/popup/enter-seed',
  CreatePassword = '/popup/create-password',
  LaunchAdena = '/popup/launch-adena',
  YourSeedPhrase = '/popup/your-seed-phrase',

  //wallet
  Wallet = '/wallet',
  WalletSearch = '/wallet/search',
  TransactionDetail = '/wallet/transaction-detail',
  Deposit = '/wallet/deposit',
  Send = '/wallet/send',
  GeneralSend = '/wallet/general-send',
  LinkSend = '/wallet/link-send',
  SendType = '/wallet/send-type',
  SendConfirm = '/wallet/send-confirm',
  LinkSendConfirm = '/wallet/link-send-confirm',
  TokenDetails = '/wallet/token-details',
  ManageToken = 'wallet/manage-token',
  AddCustomToken = 'wallet/add-custom-token',
  Connect = 'wallet/connect',
  ApproveTransaction = '/wallet/approve-transaction',
  ApproveTransactionLogin = '/wallet/approve-transaction-login',

  // wallet - nft
  // CollectiveNft = "/nft/collective",
  // OneNft = "/nft/collective/one",
  // DepositNft = "/nft/deposit",
  // NftGeneralSend = "/nft/general-send",
  // NftLinkSend = "/nft/link-send",
  // NftSendConfirm = "/nft/send-confrim",

  //wallet - staking
  // AddDelegation = "/staking/add-delegation",
  // StakingManage = "/staking/manage",
  // StakingClaiming = "/staking/claiming",
  // MyDelegation = "/staking/my-delegation",
  // MyDelegations = "/staking/my-delegations",
  // Delegate = "/staking/delegate",
  // Delegating = "/staking/delegating",
  // Undelegate = "/staking/undelegate",
  // Undelegating = "/staking/undelegating",
  // Redelegate = "/staking/redelegate",
  // Redelegating = "/staking/redelegating",
  // SelectValidatior = "/staking/select-validator",

  // send state
  SendFailed = '/wallet/send/failed',
  SendPending = '/wallet/send/pending',
  SendSuccess = '/wallet/send/success',
  LoadingScreen = '/wallet/loading-screen',

  //wallet - detail
  DetailDeposit = '/wallet/popup/deposit',
  DetailSend = '/wallet/popup/send',
  DetailSendConfirm = '/wallet/popup/send-confirm',

  // settings
  Setting = '/settings',
  SettingChangePassword = '/settings/change-password',
  SettingExportAccount = '/settings/export-account',
  SettingSeedPhrase = '/settings/seed-phrase',
  ViewPrivateKey = '/settings/view-private-key',
  ViewSeedPhrase = '/settings/view-seed-phrase',
  ConnectedApps = '/settings/connected-apps',
  AddressBook = '/settings/address-book',
  ChangeNetwork = '/settings/change-network',
  AddAddress = '/settings/add-address',
  EditAddress = '/settings/edit-address',

  //side bar
  SideBarAddAccount = '/sidebar/add-account',
  SideBarImportAccount = '/sidebar/import-account',
}
