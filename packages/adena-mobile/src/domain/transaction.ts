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

// Signer account state a tx is signed with; a chain accepts at most one tx per sequence.
export interface SignerSequence {
  sequence: string;
  // Omitted to use the on-chain account number.
  accountNumber?: string;
}

export interface SignedTransaction {
  // Base64 encoded, broadcast-ready transaction bytes.
  encoded: string;
  // Signer state the tx was signed with, when the chain adapter reports it.
  sequence?: string;
  accountNumber?: string;
}

export interface BroadcastResult {
  hash: string;
  height: string;
  // Base64 execution result data, when the chain returns one.
  data?: string;
  // False when the node only accepted it into the mempool (e.g. Cosmos sync mode); it may still fail or never commit.
  committed: boolean;
}

// Lookup result for a broadcast tx; `pending` also covers "not found yet" and lookup failures.
export type TransactionStatus = 'committed' | 'failed' | 'pending';

// Strict lookup result: null means the node answered that it has no such tx.
export type TransactionLookup = 'committed' | 'failed' | null;

// Human-readable message description used by review screens.
export interface MessageSummary {
  title: string;
  details: { label: string; value: string }[];
}
