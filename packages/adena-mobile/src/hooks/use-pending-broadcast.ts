import { useCallback, useEffect, useRef, useState } from 'react';

import { TransactionPendingError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { PendingBroadcast, pendingScope, usePendingBroadcastStore } from '../stores/pending-broadcast.store';
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
  track: (error: unknown, account: Account, network: Network) => boolean;
}

let nextOwnerId = 1;

// A broadcast that timed out may still commit, so re-sending could pay twice.
// Its hash is persisted per account and network and polled; sending there stays blocked,
// even after polling gives up or the app restarts, until it commits or fails.
export const usePendingBroadcast = (account: Account | null, network: Network, onCommitted: () => void): PendingBroadcastGuard => {
  const { transactionService, pendingBroadcastRepository: repository } = useContainer();
  const showToast = useToastStore(state => state.show);
  const accountId = account?.id;
  const scope = accountId ? pendingScope(accountId, network.id) : null;
  const pending = usePendingBroadcastStore(state => (scope ? state.entries[scope] : undefined)) ?? null;
  const setEntry = usePendingBroadcastStore(state => state.set);
  const stored = accountId ? repository.get(accountId, network.id) : undefined;
  const [ownerId] = useState(() => nextOwnerId++);
  const onCommittedRef = useRef(onCommitted);

  useEffect(() => {
    onCommittedRef.current = onCommitted;
  }, [onCommitted]);

  // Opening a send screen checks a given-up or persisted tx again, whoever wrote the record
  // (e.g. TransactionService right before the app was killed mid-broadcast).
  useEffect(() => {
    if (!accountId) {
      return;
    }

    const key = pendingScope(accountId, network.id);
    const current = usePendingBroadcastStore.getState().entries[key];
    const record = repository.get(accountId, network.id);

    if (current?.phase === 'unconfirmed') {
      setEntry(key, { ...current, phase: 'checking' });
    }
    else if (!current && record) {
      setEntry(key, { hash: record.hash, accountId, network, phase: 'checking', ownerId: 0 });
    }
  }, [accountId, network, repository, setEntry]);

  const checking = pending?.phase === 'checking' ? pending : null;

  useEffect(() => {
    if (!checking) {
      return;
    }

    const key = pendingScope(checking.accountId, checking.network.id);
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: PendingBroadcast | null): boolean => {
      // Another mounted screen may have settled the same entry already.
      if (cancelled || usePendingBroadcastStore.getState().entries[key] !== checking) {
        return false;
      }

      if (!next) {
        repository.remove(checking.accountId, checking.network.id, checking.hash);
      }

      setEntry(key, next);
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
  }, [checking, ownerId, repository, setEntry, showToast, transactionService]);

  const track = useCallback((error: unknown, sender: Account, sentNetwork: Network): boolean => {
    if (!(error instanceof TransactionPendingError)) {
      return false;
    }

    // TransactionService normally saved it before broadcasting; only write when it is missing or differs.
    if (repository.get(sender.id, sentNetwork.id)?.hash !== error.hash) {
      repository.save({ hash: error.hash, accountId: sender.id, networkId: sentNetwork.id, createdAt: Date.now() });
    }

    setEntry(pendingScope(sender.id, sentNetwork.id), { hash: error.hash, accountId: sender.id, network: sentNetwork, phase: 'checking', ownerId });
    showToast('Transaction sent. Waiting for confirmation.', 'info');
    return true;
  }, [ownerId, repository, setEntry, showToast]);

  const blocked = Boolean(pending || stored);

  return {
    canSend: !blocked,
    notice: blocked ? (pending?.phase === 'unconfirmed' ? UNCONFIRMED_NOTICE : PENDING_NOTICE) : undefined,
    track,
  };
};
