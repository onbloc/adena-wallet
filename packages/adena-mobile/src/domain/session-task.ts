// An action a card runs by itself, signed with the card's own key.

export const SessionTaskStatus = {
  SCHEDULED: 'scheduled',
  RUNNING: 'running',
  SENT: 'sent',
  // Broadcast, but the outcome was not reported; check the hash in Activity.
  UNCONFIRMED: 'unconfirmed',
  FAILED: 'failed',
  // The app stopped before the task ran; the key it needed was only in memory.
  MISSED: 'missed',
} as const;

export type SessionTaskStatus = (typeof SessionTaskStatus)[keyof typeof SessionTaskStatus];

export interface SessionTask {
  id: string;
  sessionAddress: string;
  masterAddress: string;
  accountId: string;
  networkId: string;
  toAddress: string;
  // Raw native amount.
  amount: string;
  // Epoch ms.
  runAt: number;
  createdAt: number;
  status: SessionTaskStatus;
  txHash?: string;
  error?: string;
}

export const isTaskPending = (task: SessionTask): boolean =>
  task.status === SessionTaskStatus.SCHEDULED || task.status === SessionTaskStatus.RUNNING;
