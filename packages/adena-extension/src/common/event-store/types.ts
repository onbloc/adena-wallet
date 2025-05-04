export type EventStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Event<T = unknown> {
  id: string;
  status: EventStatus;
  emitNumber: number | null;
  chainId: string;
  rpcUrl: string;
  isDefaultNetwork: boolean;
  data: T | null;
  requests: number;
  onEmit: (event: Event<T>) => Promise<void>;
}
