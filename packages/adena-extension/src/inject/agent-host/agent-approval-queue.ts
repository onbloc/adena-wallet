import { AgentHostRequestError } from './agent-host-protocol';

// Runs agent approvals one at a time, so an agent request never replaces a
// popup the user is looking at. Waiting entries can be aborted.
export class AgentApprovalQueue {
  private tail: Promise<void> = Promise.resolve();

  private size = 0;

  constructor(private readonly maxSize: number) {}

  public run<T>(task: () => Promise<T>, signal: AbortSignal): Promise<T> {
    if (this.size >= this.maxSize) {
      return Promise.reject(
        new AgentHostRequestError(
          'approval_pending',
          'too many agent requests are waiting for approval in Adena; retry later',
        ),
      );
    }
    this.size += 1;

    const result = this.tail.then(() => {
      if (signal.aborted) {
        throw new AgentHostRequestError('cancelled', 'the agent cancelled the request');
      }
      return task();
    });
    this.tail = result.then(
      () => undefined,
      () => undefined,
    );

    return result.finally(() => {
      this.size -= 1;
    });
  }
}

// Tracks a cancellation signal per host request id from the moment the request
// arrives, so a cancel or a closed channel also stops a request that is still
// preparing (checking the wallet, pricing gas) before its popup is queued.
export class AgentRequestRegistry {
  private readonly controllers = new Map<string, AbortController>();

  public begin(requestId: string): AbortSignal {
    this.controllers.get(requestId)?.abort();
    const controller = new AbortController();
    this.controllers.set(requestId, controller);
    return controller.signal;
  }

  public end(requestId: string, signal: AbortSignal): void {
    if (this.controllers.get(requestId)?.signal === signal) {
      this.controllers.delete(requestId);
    }
  }

  public cancel(requestId: string): void {
    this.controllers.get(requestId)?.abort();
  }

  public cancelAll(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }
}

export const throwIfCancelled = (signal: AbortSignal): void => {
  if (signal.aborted) {
    throw new AgentHostRequestError('cancelled', 'the agent cancelled the request');
  }
};
