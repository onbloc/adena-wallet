import { useCallback, useEffect, useRef, useState } from 'react';

import { TransactionPendingError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { Network } from '../domain/network';
import { PendingBroadcast, usePendingBroadcastStore } from '../stores/pending-broadcast.store';
import { useToastStore } from '../stores/toast.store';

export const PENDING_POLL_INTERVAL_MS = 3_000;
export const PENDING_POLL_ATTEMPTS = 20;

export const PENDING_NOTICE = 'Your transaction was sent but is not confirmed yet. Check Activity before sending again.';
export const UNCONFIRMED_NOTICE = 'We still couldn’t confirm your previous transaction. Sending stays paused until it is confirmed or fails. Check Activity, or reopen this screen to check again.';

export interface PendingBroadcastGuard {
  // False until a previous broadcast with an unknown outcome is known to have committed or failed.
  canSend: boolean;
  notice?: string;
  // Takes over an unknown broadcast outcome; returns false for any other error.
  track: (error: unknown, network: Network) => boolean;
}

let nextOwnerId = 1;

// A broadcast that timed out may still commit, so re-sending could pay twice.
// The tx hash is polled and sending stays blocked, even after polling gives up, until it commits or fails.
export const usePendingBroadcast = (onCommitted: () => void): PendingBroadcastGuard => {
  const { transactionService } = useContainer();
  const showToast = useToastStore(state => state.show);
  const pending = usePendingBroadcastStore(state => state.pending);
  const setPending = usePendingBroadcastStore(state => state.set);
  const [ownerId] = useState(() => nextOwnerId++);
  const onCommittedRef = useRef(onCommitted);

  useEffect(() => {
    onCommittedRef.current = onCommitted;
  }, [onCommitted]);

  // Opening a send screen checks a given-up tx again.
  useEffect(() => {
    const current = usePendingBroadcastStore.getState().pending;

    if (current?.phase === 'unconfirmed') {
      setPending({ ...current, phase: 'checking' });
    }
  }, [setPending]);

  const checking = pending?.phase === 'checking' ? pending : null;

  useEffect(() => {
    if (!checking) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: PendingBroadcast | null): boolean => {
      // Another mounted screen may have settled the same entry already.
      if (cancelled || usePendingBroadcastStore.getState().pending !== checking) {
        return false;
      }

      setPending(next);
      return true;
    };

    const poll = async (): Promise<void> => {
      attempts += 1;
      const status = await transactionService.getTransactionStatus(checking.hash, checking.network).catch(() => 'pending' as const);

      if (cancelled) {
        return;
      }

      if (status === 'committed') {
        if (settle(null)) {
          if (checking.ownerId === ownerId) {
            onCommittedRef.current();
          }
          else {
            showToast('Your previous transaction was confirmed.', 'success');
          }
        }
      }
      else if (status === 'failed') {
        if (settle(null)) {
          showToast('The transaction failed. You can try again.', 'error');
        }
      }
      else if (attempts >= PENDING_POLL_ATTEMPTS) {
        settle({ ...checking, phase: 'unconfirmed' });
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
  }, [checking, ownerId, setPending, showToast, transactionService]);

  const track = useCallback((error: unknown, network: Network): boolean => {
    if (!(error instanceof TransactionPendingError)) {
      return false;
    }

    setPending({ hash: error.hash, network, phase: 'checking', ownerId });
    showToast('Transaction sent. Waiting for confirmation.', 'info');
    return true;
  }, [ownerId, setPending, showToast]);

  return {
    canSend: !pending,
    notice: pending ? (pending.phase === 'checking' ? PENDING_NOTICE : UNCONFIRMED_NOTICE) : undefined,
    track,
  };
};
