export interface TransactionResponse<
  T = MsgCallValue | MsgRunValue | AddPackageValue | BankSendValue,
> {
  hash: string;
  index: number;
  success: boolean;
  block_height: number;
  balance?: Amount | null;
  gas_wanted: number;
  gas_used: number;
  gas_fee: {
    amount: number;
    denom: string;
  };
  messages: {
    typeUrl?: string;
    value: T;
  }[];
}

export interface Amount {
  value: string;
  denom: string;
}

export interface BankSendValue {
  from_address: string;
  to_address: string;
  amount: string;
}

export interface MsgRunValue {
  caller?: string;
  send?: string;
  package?: Package;
  max_deposit?: string;
}

export interface MsgCallValue {
  caller?: string;
  send?: string;
  pkg_path?: string;
  max_deposit?: string;
  func?: string;
  args?: string[];
}

export interface AddPackageValue {
  creator?: string;
  package?: Package;
  send?: string;
  max_deposit?: string;
}

export interface Package {
  name: string;
  path: string;
  files?: {
    name: string;
    body: string;
  }[];
}

export interface Event {
  type: string;
  pkg_path: string;
  func: string;
  attrs: Attr[];
}

export interface Attr {
  key: string;
  value: string;
}
