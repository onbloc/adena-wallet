// Public API of agent: an LLM, a harness and a wallet wired into one assistant.
export { AIAgent } from './agent';
export type { AIAgentOptions } from './agent';
export {
  ApprovalPolicy,
  SignRequestType,
  TokenSymbol,
  ToolName,
  WalletErrorCode,
  WalletStatus,
} from './wallet/constants';
export { WalletError } from './wallet/port';
export type {
  Allowance,
  AllowanceMessage,
  AllowanceParams,
  ApprovalHandler,
  Balances,
  Contact,
  SignOptions,
  SignRequest,
  SignResult,
  TextMessage,
  TransferMessage,
  TransferParams,
  WalletSdk,
} from './wallet/port';
