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
