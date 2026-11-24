import { useCallback, useEffect, useRef, useState } from 'react';

import { TransactionPendingError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { Network } from '../domain/network';
import { useToastStore } from '../stores/toast.store';

export const PENDING_POLL_INTERVAL_MS = 3_000;
export const PENDING_POLL_ATTEMPTS = 20;

export const PENDING_NOTICE = 'Your transaction was sent but is not confirmed yet. Check Activity before sending again.';
export const UNCONFIRMED_NOTICE = 'We couldn’t confirm your previous transaction. Check Activity before sending again.';

interface PendingBroadcast {
  hash: string;
  network: Network;
  // `checking` blocks a new send; `unconfirmed` means polling gave up and only the notice stays.
  phase: 'checking' | 'unconfirmed';
}

export interface PendingBroadcastGuard {
  // False while a previous broadcast may still commit.
  canSend: boolean;
  notice?: string;
  // Takes over an unknown broadcast outcome; returns false for any other error.
  track: (error: unknown, network: Network) => boolean;
}

// A broadcast that timed out may still commit, so re-sending the reviewed draft could pay twice.
// The tx hash is polled first; only a failed or unconfirmable tx allows a new send.
export const usePendingBroadcast = (onCommitted: () => void): PendingBroadcastGuard => {
  const { transactionService } = useContainer();
  const showToast = useToastStore(state => state.show);
  const [pending, setPending] = useState<PendingBroadcast | null>(null);
  const onCommittedRef = useRef(onCommitted);

  useEffect(() => {
    onCommittedRef.current = onCommitted;
  }, [onCommitted]);

  const checking = pending?.phase === 'checking' ? pending : null;

  useEffect(() => {
    if (!checking) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async (): Promise<void> => {
      attempts += 1;
      const status = await transactionService.getTransactionStatus(checking.hash, checking.network).catch(() => 'pending' as const);

      if (cancelled) {
        return;
      }

      if (status === 'committed') {
        setPending(null);
        onCommittedRef.current();
      }
      else if (status === 'failed') {
        setPending(null);
        showToast('The transaction failed. You can try again.', 'error');
      }
      else if (attempts >= PENDING_POLL_ATTEMPTS) {
        setPending({ ...checking, phase: 'unconfirmed' });
      }
      else {
        timer = setTimeout(poll, PENDING_POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(poll, PENDING_POLL_INTERVAL_MS);

    return (): void => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checking, showToast, transactionService]);

  const track = useCallback((error: unknown, network: Network): boolean => {
    if (!(error instanceof TransactionPendingError)) {
      return false;
    }

    setPending({ hash: error.hash, network, phase: 'checking' });
    showToast('Transaction sent. Waiting for confirmation.', 'info');
    return true;
  }, [showToast]);

  return {
    canSend: pending?.phase !== 'checking',
    notice: pending ? (pending.phase === 'checking' ? PENDING_NOTICE : UNCONFIRMED_NOTICE) : undefined,
    track,
  };
};
