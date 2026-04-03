import { ContractMessage } from '@inject/types';

export interface ParsedTransactionErrors {
  globalErrorMessage: string | null;
  messageErrors: (string | undefined)[];
}

/**
 * Parses a simulate error message and attempts to associate it with
 * the specific transaction message (by index) that caused the error.
 *
 * Gno VM errors often contain the msg index or package path that failed.
 * If we can match it to a specific message, we set `messageErrors[index]`.
 * Otherwise, we set `globalErrorMessage` for display as a banner.
 */
export function parseSimulateErrors(
  simulateErrorMessage: string | null,
  messages: ContractMessage[],
): ParsedTransactionErrors {
  const result: ParsedTransactionErrors = {
    globalErrorMessage: null,
    messageErrors: new Array(messages.length).fill(undefined),
  };

  if (!simulateErrorMessage) {
    return result;
  }

  const errorMsg = simulateErrorMessage.trim();

  const msgIndexMatch = errorMsg.match(/msg\s*(\d+)/i);
  if (msgIndexMatch) {
    const msgIndex = parseInt(msgIndexMatch[1], 10);
    if (msgIndex >= 0 && msgIndex < messages.length) {
      result.messageErrors[msgIndex] = 'Invalid parameter';
      result.globalErrorMessage = errorMsg;
      return result;
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const pkgPath = (msg.value as { pkg_path?: string })?.pkg_path;
    const func = (msg.value as { func?: string })?.func;

    if (pkgPath && errorMsg.includes(pkgPath)) {
      result.messageErrors[i] = 'Invalid parameter';
      result.globalErrorMessage = errorMsg;
      return result;
    }

    if (func && errorMsg.includes(func)) {
      result.messageErrors[i] = 'Invalid parameter';
      result.globalErrorMessage = errorMsg;
      return result;
    }
  }

  result.globalErrorMessage = errorMsg;
  return result;
}
