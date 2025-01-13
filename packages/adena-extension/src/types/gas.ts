export enum NetworkFeeSettingType {
  FAST = 'FAST',
  AVERAGE = 'AVERAGE',
  SLOW = 'SLOW',
}

export interface NetworkFeeSettingInfo {
  settingType: NetworkFeeSettingType;
  gasPrice: {
    amount: string;
    denom: string;
    estimatedAmount: string;
  };
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
