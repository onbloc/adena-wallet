export enum NetworkFeeSettingType {
  FAST = 'FAST',
  AVERAGE = 'AVERAGE',
  SLOW = 'SLOW',
  CUSTOM = 'CUSTOM',
}

export interface NetworkFeeSettingInfo {
  settingType: NetworkFeeSettingType;
  gasPrice: GasPrice | null;
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
