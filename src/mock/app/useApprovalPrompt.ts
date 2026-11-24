import { useCallback, useState } from 'react';

import type { ApprovalHandler, SignRequest } from '../../agent';

type Pending = { request: SignRequest; settle: (approved: boolean) => void };

/**
 * Bridges the wallet SDK's `requestApproval` to a modal: each request waits
 * until the user approves or rejects. Requests queue, so none is lost. A
 * request whose call is aborted (Stop, or the screen unmounting) is rejected.
 */
export function useApprovalPrompt() {
  const [queue, setQueue] = useState<Pending[]>([]);

  const requestApproval = useCallback<ApprovalHandler>((request, { signal }) => {
    if (signal?.aborted) return Promise.resolve(false);
    // Executor form: Promise.withResolvers is not guaranteed on Hermes.
    return new Promise<boolean>((resolve) => {
      const entry: Pending = {
        request,
        settle: (approved) => {
          signal?.removeEventListener('abort', onAbort);
          setQueue((current) => current.filter((pending) => pending !== entry));
          resolve(approved);
        },
      };
      const onAbort = () => entry.settle(false);
      signal?.addEventListener('abort', onAbort, { once: true });
      setQueue((current) => [...current, entry]);
    });
  }, []);

  return {
    /** The request the popup should show now. */
    current: queue[0]?.request ?? null,
    approve: () => queue[0]?.settle(true),
    reject: () => queue[0]?.settle(false),
    requestApproval,
  };
}
