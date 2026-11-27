// Public API of agent: an LLM, a harness and a wallet wired into one assistant.
export { AIAgent } from './agent';
export type { AIAgentOptions } from './agent';
export {
  ToolName,
  TransactionType,
  WalletErrorCode,
  WalletStatus,
} from './wallet/constants';
export { fromBaseUnits, normalizeDecimal, toBaseUnits } from './wallet/amount';
export { WalletError } from './wallet/port';
export type {
  Allowance,
  AllowanceParams,
  AllowanceSummary,
  Contact,
  PreparedTransaction,
  TransactionHandler,
  TransferParams,
  TransferSummary,
  WalletOperationOptions,
  WalletSdk,
} from './wallet/port';
