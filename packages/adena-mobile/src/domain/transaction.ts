// Chain-agnostic transaction envelope. TMessage is defined by each chain adapter.
export interface TransactionDraft<TMessage = unknown> {
  networkId: string;
  chainId: string;
  messages: TMessage[];
  fee: TransactionFee;
  memo: string;
}

export interface TransactionFee {
  gasWanted: string;
  // Coin string in the smallest denomination, e.g. "100000ugnot".
  gasFee: string;
}

export interface SignedTransaction {
  // Base64 encoded, broadcast-ready transaction bytes.
  encoded: string;
}

export interface BroadcastResult {
  hash: string;
  height: string;
  // Base64 execution result data, when the chain returns one.
  data?: string;
}

// Human-readable message description used by review screens.
export interface MessageSummary {
  title: string;
  details: { label: string; value: string }[];
}
