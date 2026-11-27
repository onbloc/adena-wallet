import { Account } from './account';
import { Network } from './network';
import { Token } from './token';
import { TransactionDraft } from './transaction';

// A transfer the assistant prepared. Nothing is signed or sent until the user reviews and confirms it.
export interface AiTransferDraft {
  id: string;
  account: Account;
  network: Network;
  token: Token;
  toAddress: string;
  recipientName?: string;
  // Raw integer amount in the token's smallest unit.
  amount: string;
  draft: TransactionDraft;
}

// What became of a transfer the assistant prepared; fed back so the model can answer questions about it.
export type AiTransferOutcome = 'sent' | 'submitted' | 'unconfirmed' | 'dismissed';

export interface AiChatTurn {
  prompt: string;
  answer: string;
}

export type AiToolStatus = 'running' | 'done' | 'error';

// What a run reports to the UI, in order.
export type AiRunEvent
  = { type: 'text'; delta: string }
    | { type: 'tool'; id: string; name: string; status: AiToolStatus; detail?: string }
    | { type: 'draft'; draft: AiTransferDraft }
    | { type: 'done'; aborted: boolean; warnings: string[] }
    | { type: 'error'; message: string };

export interface AiModelOption {
  id: string;
  name: string;
}

export interface AiConfig {
  provider: 'openai' | 'local';
  model: string;
  hasApiKey: boolean;
  models: AiModelOption[];
}

export interface AiConfigInput {
  provider?: 'openai' | 'local';
  model?: string;
  // A new key; null removes the stored one, undefined keeps it.
  apiKey?: string | null;
}

export type AiLocalModelStatus
  = { state: 'idle' | 'ready' }
    | { state: 'downloading'; percentage: number }
    | { state: 'loading' | 'unloading' }
    | { state: 'error'; message: string };

// The on-device model, observable by the UI.
export interface AiLocalModel {
  getStatus(): AiLocalModelStatus;
  subscribe(listener: () => void): () => void;
  load(): Promise<void>;
  unload(): Promise<void>;
  remove(): Promise<void>;
}
