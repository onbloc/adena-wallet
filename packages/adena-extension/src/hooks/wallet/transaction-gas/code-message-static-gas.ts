import { Account, Document, isAirgapAccount, isLedgerAccount } from 'adena-module';

/**
 * Gas fallback for code-bearing messages (`/vm.m_addpkg`, `/vm.m_run`).
 *
 * Since gnolang/gno#6088 the chain verifies signatures on the simulate path for
 * these messages, so gas can only be estimated with a real signature. Accounts
 * that cannot sign in-process (Ledger, AirGap) have no key available while the
 * fee is being calculated, so they fall back to the table below.
 *
 * To tune a value, simulate the same message with an in-process account, read
 * `gas_used`, and update the entry here — this table is the only place to edit.
 */

export type CodeMessageGasType = 'ADD_PACKAGE' | 'MSG_RUN' | 'MSG_RUN_GRC20_TRANSFER';

/** Conservative `gasUsed` per message type; the fee is derived from it. */
export const STATIC_CODE_MESSAGE_GAS_USED: Record<CodeMessageGasType, number> = {
  ADD_PACKAGE: 12_000_000,
  MSG_RUN: 6_000_000,
  MSG_RUN_GRC20_TRANSFER: 3_000_000,
};

const MSG_ADD_PACKAGE_TYPE = '/vm.m_addpkg';
const MSG_RUN_TYPE = '/vm.m_run';

// The GRC20 transfer run body is generated in transfer-summary with the
// registry imported as `grc20reg`, so this marker identifies it regardless of
// which chain's registry path was used.
const GRC20_TRANSFER_MARKER = 'grc20reg.Transfer(';

type DocumentMessage = Document['msgs'][number];

function isGRC20TransferRun(message: DocumentMessage): boolean {
  const files: { body?: string }[] = message.value?.package?.files ?? [];
  return files.some((file) => (file?.body ?? '').includes(GRC20_TRANSFER_MARKER));
}

/** The gas bucket a message falls into, or null when it needs no fallback. */
export function resolveCodeMessageGasType(message: DocumentMessage): CodeMessageGasType | null {
  if (message.type === MSG_ADD_PACKAGE_TYPE) {
    return 'ADD_PACKAGE';
  }
  if (message.type === MSG_RUN_TYPE) {
    return isGRC20TransferRun(message) ? 'MSG_RUN_GRC20_TRANSFER' : 'MSG_RUN';
  }
  return null;
}

/** True when the account has no key available during fee calculation. */
export function canSignInProcess(account?: Account | null): boolean {
  if (!account) {
    return false;
  }
  return !isLedgerAccount(account) && !isAirgapAccount(account);
}

/**
 * Static `gasUsed` for a document, or null when it carries no code-bearing
 * message. Sums the buckets so a multi-message document is still covered.
 */
export function resolveStaticCodeMessageGasUsed(document?: Document | null): number | null {
  const types = (document?.msgs ?? [])
    .map(resolveCodeMessageGasType)
    .filter((type): type is CodeMessageGasType => type !== null);

  if (types.length === 0) {
    return null;
  }
  return types.reduce((total, type) => total + STATIC_CODE_MESSAGE_GAS_USED[type], 0);
}
