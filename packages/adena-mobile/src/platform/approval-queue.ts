import type {ApprovalPresenter} from '@inject/message/approval-presenter';
import type {InjectionMessage} from '@inject/message/message';

export interface PendingApproval {
  id: number;
  /** The extension route of the approval screen, e.g. `/approve-transaction`. */
  path: string;
  message: InjectionMessage;
}

type Listener = (current: PendingApproval | null, queued: number) => void;

interface Entry extends PendingApproval {
  closeMessage: InjectionMessage;
  sendResponse: (response: any) => void;
}

/**
 * Mobile `ApprovalPresenter`: dApp requests wait in a queue and the UI shows
 * one approval screen at a time, so a page cannot stack prompts on top of the
 * one the user is reading. Every request is answered exactly once.
 */
export class ApprovalQueue implements ApprovalPresenter {
  private entries: Entry[] = [];

  private nextId = 1;

  private readonly listeners = new Set<Listener>();

  /** Builds the reply for a request that was dismissed without a user decision. */
  constructor(
    private readonly makeDismissedResponse: (
      message: InjectionMessage,
    ) => unknown,
  ) {}

  present = async (
    path: string,
    message: InjectionMessage,
    closeMessage: InjectionMessage,
    sendResponse: (response: any) => void,
  ): Promise<void> => {
    this.entries.push({
      id: this.nextId++,
      path,
      message,
      closeMessage,
      sendResponse,
    });
    this.emit();
  };

  hasOpenApprovals = async (): Promise<boolean> => this.entries.length > 0;

  dismissAll = async (): Promise<void> => {
    const dismissed = this.entries;
    this.entries = [];
    dismissed.forEach(entry =>
      entry.sendResponse(this.makeDismissedResponse(entry.message)),
    );
    this.emit();
  };

  current(): PendingApproval | null {
    const head = this.entries[0];
    return head ? {id: head.id, path: head.path, message: head.message} : null;
  }

  /** The approval screen's answer for request `id`. Ignored if `id` is no longer pending. */
  resolve(id: number, response: InjectionMessage): void {
    this.settle(id, entry => entry.sendResponse(response));
  }

  /** The user closed the approval screen without deciding. */
  reject(id: number): void {
    this.settle(id, entry => entry.sendResponse(entry.closeMessage));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.current(), this.entries.length);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private settle(id: number, answer: (entry: Entry) => void): void {
    const index = this.entries.findIndex(entry => entry.id === id);
    if (index < 0) {
      return;
    }
    const [entry] = this.entries.splice(index, 1);
    answer(entry);
    this.emit();
  }

  private emit(): void {
    const current = this.current();
    this.listeners.forEach(listener => listener(current, this.entries.length));
  }
}
