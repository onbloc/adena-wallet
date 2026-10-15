export type OnboardingStackParams = {
  Welcome: undefined;
  CreateMnemonic: undefined;
  ConfirmMnemonic: undefined;
  ImportWallet: undefined;
  SetPassword: undefined;
};

export type MainStackParams = {
  Home: undefined;
  Receive: undefined;
  Send: {scannedAddress?: string} | undefined;
  SendConfirm: {to: string; ugnot: string; memo: string};
  QrScan: undefined;
  Browser: {url?: string} | undefined;
  Settings: undefined;
  Networks: undefined;
  ChangePassword: undefined;
  RevealMnemonic: undefined;
};
