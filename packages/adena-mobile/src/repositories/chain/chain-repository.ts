import { TokenBalance } from '../../domain/account';
import { FeeEstimate } from '../../domain/fee';
import { ChainFamily, Network } from '../../domain/network';
import {
  BroadcastResult,
  MessageSummary,
  SignedTransaction,
  TransactionDraft,
} from '../../domain/transaction';

export interface SigningKey {
  privateKey: Uint8Array;
  publicKey: Uint8Array;
}

// Key access for fee simulation. `withKey` is absent while the wallet is locked;
// chains that only simulate signed txs then fall back to a conservative estimate.
export interface SimulationSigner {
  publicKey: Uint8Array;
  withKey?: <T>(task: (key: SigningKey) => Promise<T>) => Promise<T>;
}

// Chain-family adapter: every network access and chain-specific encoding goes through here.
export interface ChainRepository<TMessage = unknown> {
  readonly family: ChainFamily;
  deriveAddress(publicKey: Uint8Array, network: Network): string;
  isValidAddress(address: string, network: Network): boolean;
  getChainId(network: Network): Promise<string>;
  getNativeBalance(address: string, network: Network): Promise<TokenBalance>;
  // Validates untrusted (e.g. deep link) messages and returns typed messages.
  parseMessages(raw: unknown[], signerAddress: string): TMessage[];
  describeMessages(messages: TMessage[], network: Network): MessageSummary[];
  // Simulates the draft and reports gas usage plus the chain's gas price.
  estimateFee(draft: TransactionDraft<TMessage>, signer: SimulationSigner, network: Network): Promise<FeeEstimate>;
  signTransaction(draft: TransactionDraft<TMessage>, key: SigningKey, network: Network): Promise<SignedTransaction>;
  broadcastTransaction(signed: SignedTransaction, network: Network): Promise<BroadcastResult>;
}
