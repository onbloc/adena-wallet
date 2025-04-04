export enum NetworkFeeSettingType {
  FAST = 'FAST',
  AVERAGE = 'AVERAGE',
  SLOW = 'SLOW',
}

export interface NetworkFeeSettingInfo {
  settingType: NetworkFeeSettingType;
  gasInfo: GasInfo;
}

export interface GasPriceTierInfo {
  low: number;
  average: number;
  high: number;
}

export interface GasPrice {
  amount: string;
  denom: string;
}

export interface NetworkFee {
  amount: string;
  denom: string;
}

export interface GasInfo {
  gasFee: number;
  gasUsed: number;
  gasWanted: number;
  gasPrice: number;
  hasError?: boolean;
  simulateErrorMessage: string | null;
}
