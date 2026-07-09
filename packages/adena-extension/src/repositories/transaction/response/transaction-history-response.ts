export interface TransactionHistoryResponse {
  page: {
    cursor: string;
    hasNext: boolean;
  };
  items: TransactionHistoryItem[];
}

export interface TransactionHistoryItem {
  amountIn: {
    denom: string;
    value: string;
  };
  amountOut: {
    denom: string;
    value: string;
  };
  blockHeight: number;
  fee: {
    denom: string;
    value: string;
  };
  storageDeposit?: {
    denom: string;
    value: number;
  };
  func: [
    {
      funcType: string;
      messageType: string;
      pkgPath: string;
    },
  ];
  isGRC20Transfer: boolean;
  isGRC721Transfer: boolean;
  messageCount: number;
  successYn: boolean;
  timestamp: string;
  fromAddress: string;
  toAddress: string;
  // On-chain caller (master account for a session-signed tx). Optional for
  // backward compatibility with API versions that predate the field.
  callerAddress?: string;
  // Session account that signed the tx, or "" for a master-key signature.
  sessionAddress?: string;
  txHash: string;
}
