import { WalletResponseFailureType, WalletResponseSuccessType } from '@adena-wallet/sdk';
import { SCANNER_URL } from '@common/constants/resource.constant';
import { Event, EventStatus, EventStore } from '@common/event-store';
import { MemoryProvider } from '@common/provider/memory/memory-provider';
import { fromBase64, toBase64 } from '@common/utils/client-utils';
import { BroadcastTxCommitResult, BroadcastTxSyncResult } from '@gnolang/tm2-js-client';
import { CommandMessageData } from '@inject/message/command-message';
import { InjectionMessage, InjectionMessageInstance } from '@inject/message/message';
import { InjectCore } from './core';
import { createNotification } from './notification';

export async function addTransactionEvent(
  inMemoryProvider: MemoryProvider,
  transactionEventStore: EventStore<string[]>,
  message: InjectionMessage | CommandMessageData | any,
): Promise<Event<string[]> | null> {
  if (!message?.withNotification) {
    return null;
  }

  const messageType = message?.type;
  const messageStatus = message?.status;
  const transactionHash = message?.data?.hash;

  if (
    messageType !== WalletResponseSuccessType.TRANSACTION_SUCCESS &&
    messageType !== WalletResponseFailureType.TRANSACTION_FAILED
  ) {
    return null;
  }

  if (messageStatus !== 'success' && messageStatus !== 'failure') {
    return null;
  }

  if (!transactionHash) {
    return null;
  }

  const core = new InjectCore(inMemoryProvider);
  const network = await core.getCurrentNetwork();
  if (!network) {
    return null;
  }

  const isDefaultNetwork = !!network.apiUrl;

  createTransactionNotification(
    'PENDING',
    transactionHash,
    network.chainId,
    network.rpcUrl,
    isDefaultNetwork,
  );

  return transactionEventStore.addEvent(
    transactionHash,
    network.chainId,
    network.rpcUrl,
    isDefaultNetwork,
    async (eventResult): Promise<void> => {
      createTransactionNotification(
        eventResult.status,
        transactionHash,
        network.chainId,
        network.rpcUrl,
        isDefaultNetwork,
      );
    },
  );
}

function createTransactionNotificationId(
  txHash: string,
  status: EventStatus,
  chainId: string,
  rpcUrl: string,
  isDefaultNetwork: boolean,
): string {
  const scannerUrl = `${SCANNER_URL}/transactions/details?=txhash=${txHash}`;
  const resultScannerUrl = isDefaultNetwork
    ? `${scannerUrl}&chainId=${chainId}`
    : `${scannerUrl}&type=custom&rpcUrl=${rpcUrl}`;

  const encodedResultScannerUrl = toBase64(resultScannerUrl);

  return `tx-${status}-${txHash}-${encodedResultScannerUrl}`;
}

function createTransactionNotification(
  eventStatus: EventStatus,
  txHash: string,
  chainId: string,
  rpcUrl: string,
  isDefaultNetwork: boolean,
): void {
  const notificationId = createTransactionNotificationId(
    txHash,
    eventStatus,
    chainId,
    rpcUrl,
    isDefaultNetwork,
  );
  const notificationTitle = mapEventStatusToNotificationTitle(eventStatus);
  const notificationMessage = mapTransactionInfoToNotificationMessage(eventStatus, txHash);

  createNotification(notificationId, notificationTitle, notificationMessage);
}

function mapEventStatusToNotificationTitle(eventStatus: EventStatus): string {
  switch (eventStatus) {
    case 'SUCCESS':
      return 'Transaction successful!';
    case 'FAILED':
      return 'Transaction failed!';
    default:
      return 'Broadcasting transaction…';
  }
}

function mapTransactionInfoToNotificationMessage(eventStatus: EventStatus, txHash: string): string {
  if (eventStatus === 'PENDING') {
    return 'Please wait a moment.';
  }

  return `TxHash: ${txHash}`;
}

export function isTransactionNotification(notificationId: string): boolean {
  return notificationId.startsWith('tx-');
}

export function parseTransactionScannerUrl(notificationId: string): string | null {
  const values = notificationId.split('-');
  if (values.length !== 4) {
    return null;
  }

  const [, , , encodedResultScannerUrl] = values;
  return fromBase64(encodedResultScannerUrl);
}

export function createNotificationSendMessage(
  result: BroadcastTxCommitResult | BroadcastTxSyncResult | null,
): void {
  chrome.runtime
    .sendMessage(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.TRANSACTION_SUCCESS,
        {
          hash: result?.hash,
        },
        '',
        true,
      ),
    )
    .catch((error) => {
      console.warn('Failed to send transaction notification:', error);
    });
}

export function createNotificationSendMessageByHash(hash: string): void {
  chrome.runtime
    .sendMessage(
      InjectionMessageInstance.success(
        WalletResponseSuccessType.TRANSACTION_SUCCESS,
        {
          hash,
        },
        '',
        true,
      ),
    )
    .catch((error) => {
      console.warn('Failed to send transaction notification:', error);
    });
}
