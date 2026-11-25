import { create } from 'zustand';

import { DappRequest } from '../domain/dapp';

// Requests beyond this are dropped so a misbehaving dApp cannot pile up prompts.
export const MAX_QUEUED_DAPP_REQUESTS = 5;

export interface ActiveDappRequest {
  url: string;
  request: DappRequest;
}

interface DappRequestState {
  // Raw deep links waiting their turn; only one request is presented at a time.
  queue: string[];
  active: ActiveDappRequest | null;
  // Set while signing/broadcasting; the active request must not be replaced or requeued then.
  inFlight: boolean;
  enqueue: (url: string) => boolean;
  dequeue: () => string | null;
  setActive: (active: ActiveDappRequest | null) => void;
  setInFlight: (inFlight: boolean) => void;
  // Puts an unanswered active request back at the head of the queue (e.g. the wallet locked).
  requeueActive: () => void;
}

export const useDappRequestStore = create<DappRequestState>((set, get) => ({
  queue: [],
  active: null,
  inFlight: false,
  enqueue: (url): boolean => {
    const { queue, active } = get();

    if (active?.url === url || queue.includes(url)) {
      return true;
    }

    if (queue.length >= MAX_QUEUED_DAPP_REQUESTS) {
      return false;
    }

    set({ queue: [...queue, url] });
    return true;
  },
  dequeue: (): string | null => {
    const [head, ...rest] = get().queue;

    if (head === undefined) {
      return null;
    }

    set({ queue: rest });
    return head;
  },
  setActive: (active): void => set({ active, inFlight: false }),
  setInFlight: (inFlight): void => set({ inFlight }),
  requeueActive: (): void => {
    const { active, inFlight, queue } = get();

    if (!active || inFlight) {
      return;
    }

    set({ active: null, queue: [active.url, ...queue] });
  },
}));
