import type {InjectionMessage} from '@inject/message/message';

import type {PendingApproval} from '../platform/approval-queue';

export interface ApprovalProps {
  request: PendingApproval;
  /** Aborted once the request is no longer pending, e.g. a newer request dismissed it. */
  signal: AbortSignal;
  /** Sends the response to the page and closes the approval. */
  respond(response: InjectionMessage | Record<string, unknown>): void;
  /** Closes without a decision; the page gets the request's close message. */
  dismiss(): void;
}
