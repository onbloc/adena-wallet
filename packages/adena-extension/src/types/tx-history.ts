export interface TransactionWithPageInfo {
  page: {
    hasNext: boolean;
    cursor: string | null;
  };
  transactions: TransactionInfo[];
}

export interface TransactionInfo {
  hash: string;
  height?: number;
  logo: string;
  type: 'TRANSFER' | 'TRANSFER_GRC721' | 'ADD_PACKAGE' | 'CONTRACT_CALL' | 'MULTI_CONTRACT_CALL';
  typeName?: string;
  status: 'SUCCESS' | 'FAIL';
  title: string;
  description?: string;
  extraInfo?: string;
  amount: {
    value: string;
    denom: string;
  };
  valueType: 'DEFAULT' | 'ACTIVE' | 'BLUR';
  date: string;
  from?: string;
  originFrom?: string;
  to?: string;
  originTo?: string;
  networkFee?: {
    value: string;
    denom: string;
  };
}
