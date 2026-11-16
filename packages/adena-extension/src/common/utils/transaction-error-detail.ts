import { WalletResponseFailureType } from '@adena-wallet/sdk';
import { InjectionMessage } from '@inject/message';

export interface TransactionErrorDetail {
  title: string;
  description: string;
  suggestion?: string;
  rawError?: string;
  errorCode?: string;
}

/**
 * Maps transaction failure response to a structured error detail for UI.
 * Goal: display errors in detail so users understand what went wrong.
 */
export function getTransactionErrorDetail(
  response: InjectionMessage,
): TransactionErrorDetail | null {
  if (response.status !== 'failure') {
    return null;
  }

  const type = response.type as WalletResponseFailureType;
  const data = response.data ?? {};
  const serverMessage = typeof data?.error === 'string' ? data.error : data?.error?.message;
  const hash = data?.hash;

  const base: TransactionErrorDetail = {
    title: 'Transaction Failed',
    description: response.message || 'Something went wrong while sending the transaction.',
    rawError:
      serverMessage || (typeof data?.error === 'object' ? JSON.stringify(data.error) : undefined),
    errorCode: type,
  };

  switch (type) {
    case WalletResponseFailureType.TRANSACTION_FAILED:
      return {
        ...base,
        title: 'Transaction Failed',
        description: serverMessage
          ? 'The network rejected your transaction.'
          : 'Your transaction could not be completed. The request may have timed out or the network returned an error.',
        suggestion: serverMessage
          ? 'Review the error below and fix the transaction before trying again.'
          : 'Check your network connection and balance, then try again. If the problem continues, try again later.',
        rawError:
          [serverMessage, hash ? `TxHash: ${hash}` : ''].filter(Boolean).join('\n') ||
          base.rawError,
      };
    case WalletResponseFailureType.NETWORK_TIMEOUT:
      return {
        ...base,
        title: 'Network Timeout',
        description: 'The request took too long. The network or RPC may be slow or unavailable.',
        suggestion:
          'Check your internet connection and try again. If the network is busy, wait a moment and retry.',
        rawError: serverMessage || base.rawError,
      };
    case WalletResponseFailureType.UNEXPECTED_ERROR:
      return {
        ...base,
        title: 'Unexpected Error',
        description: 'An unexpected error occurred while preparing or sending the transaction.',
        suggestion:
          'Try again. If the problem continues, refresh the page and ensure your wallet is unlocked.',
        rawError: serverMessage || base.rawError,
      };
    default:
      return {
        ...base,
        description: response.message || base.description,
        suggestion: 'Try again or contact support if the problem continues.',
        rawError: serverMessage || base.rawError,
      };
  }
}
