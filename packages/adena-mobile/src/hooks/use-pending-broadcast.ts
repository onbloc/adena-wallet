import { useCallback, useEffect, useRef, useState } from 'react';

import { TransactionPendingError } from '../core/errors';
import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { Network } from '../domain/network';
import { BroadcastResult } from '../domain/transaction';
import { PendingReconciliation, SettledPending } from '../services/transaction.service';
import { PendingBroadcast, pendingScope, usePendingBroadcastStore } from '../stores/pending-broadcast.store';
import { useToastStore } from '../stores/toast.store';
import { StatusTone } from '../theme/colors';

export const PENDING_POLL_INTERVAL_MS = 3_000;
export const PENDING_POLL_ATTEMPTS = 20;

export const PENDING_NOTICE = 'Your transaction was sent but is not confirmed yet. Check Activity before sending again.';
export const UNCONFIRMED_NOTICE = 'We still couldn’t confirm your previous transaction. Sending stays paused until it is confirmed or fails. Check Activity, or reopen this screen to check again.';
export const REPLACEABLE_NOTICE = 'Your previous transaction was not confirmed. Sending again replaces it, so only one can go through.';
export const NOT_INCLUDED_MESSAGE = 'Your previous transaction was not sent. You can send again.';

const SETTLED_TOASTS: Record<SettledPending['status'], [string, StatusTone]> = {
  committed: ['Your previous transaction was confirmed.', 'success'],
  failed: ['The transaction failed. You can try again.', 'error'],
  not_included: [NOT_INCLUDED_MESSAGE, 'info'],
};

export interface PendingBroadcastGuard {
  // False while a previous send of unknown outcome blocks this account and chain, unless it may be replaced.
  canSend: boolean;
  // A send now must go through signAndBroadcast's `replacePending` path.
  replacesPending: boolean;
  notice?: string;
  // Takes over an unknown broadcast outcome; returns false for any other error.
  track: (error: unknown, account: Account, network: Network) => boolean;
  // Takes over a tx the node accepted but has not committed yet (BroadcastResult.committed false).
  trackSubmitted: (result: BroadcastResult, account: Account, network: Network) => void;
}

let nextOwnerId = 1;
let nextRound = 1;

// A broadcast that timed out may still commit, so re-sending could pay twice.
// Records are persisted per account and chain and each is reconciled against the chain; sending stays
// blocked until every one commits, fails, or has its sequence consumed by another tx. While a single
// record is left with its sequence still current, only a replacement pinned to that sequence is allowed.
export const usePendingBroadcast = (account: Account | null, network: Network, onCommitted: () => void): PendingBroadcastGuard => {
  const { transactionService, pendingBroadcastRepository: repository } = useContainer();
  const showToast = useToastStore(state => state.show);
  const accountId = account?.id;
  const scope = accountId ? pendingScope(accountId, network.chainId) : null;
  const pending = usePendingBroadcastStore(state => (scope ? state.entries[scope] : undefined)) ?? null;
  const setEntry = usePendingBroadcastStore(state => state.set);
  const stored = accountId ? repository.list(accountId, network.chainId).length > 0 : false;
  const [ownerId] = useState(() => nextOwnerId++);
  const onCommittedRef = useRef(onCommitted);
  const accountRef = useRef(account);

  useEffect(() => {
    onCommittedRef.current = onCommitted;
    accountRef.current = account;
  }, [account, onCommitted]);

  // Opening a send screen checks a given-up or persisted tx again, whoever wrote the record
  // (e.g. TransactionService right before the app was killed mid-broadcast).
  useEffect(() => {
    if (!accountId) {
      return;
    }

    const key = pendingScope(accountId, network.chainId);
    const current = usePendingBroadcastStore.getState().entries[key];

    if (current?.phase === 'unconfirmed') {
      setEntry(key, { ...current, phase: 'checking', round: nextRound++ });
    }
    else if (!current && repository.list(accountId, network.chainId).length > 0) {
      setEntry(key, { accountId, network, phase: 'checking', round: nextRound++, replaceable: false, ownerId: 0 });
    }
  }, [accountId, network, repository, setEntry]);

  // Keyed by round, so updating `replaceable` mid-round does not restart polling.
  const checkingRound = pending?.phase === 'checking' && scope ? pending.round : null;

  useEffect(() => {
    const sender = accountRef.current;
    const checking = scope ? usePendingBroadcastStore.getState().entries[scope] : undefined;

    if (checkingRound === null || !scope || !sender || checking?.round !== checkingRound) {
      return;
    }

    const key = scope;
    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const settle = (next: PendingBroadcast | null): boolean => {
      // Another mounted screen may have settled the same entry already.
      if (cancelled || usePendingBroadcastStore.getState().entries[key]?.round !== checkingRound) {
        return false;
      }

      setEntry(key, next);
      return true;
    };

    const poll = async (): Promise<void> => {
      attempts += 1;

      const result: PendingReconciliation = await transactionService.reconcilePending(sender, checking.network)
        .catch(() => ({ status: 'pending' as const, settled: [] }));

      if (cancelled) {
        return;
      }

      let ownCommitted = false;

      // Each settled record is reported once, by the reconcile that removed it.
      for (const item of result.settled) {
        // reconcilePending already dropped the record; repeated here in case another writer re-saved it.
        if (item.status !== 'not_included') {
          repository.remove(checking.accountId, checking.network.chainId, item.hash);
        }

        if (item.status === 'committed' && checking.ownerId === ownerId && checking.ownedRecordId === item.id) {
          ownCommitted = true;
        }
        else {
          showToast(...SETTLED_TOASTS[item.status]);
        }
      }

      if (ownCommitted) {
        onCommittedRef.current();
      }

      if (result.status === 'none') {
        settle(null);
        return;
      }

      const replaceable = result.status === 'replaceable';
      const exhausted = attempts >= PENDING_POLL_ATTEMPTS;
      const latest = usePendingBroadcastStore.getState().entries[key];

      if (latest && (exhausted || latest.replaceable !== replaceable)) {
        settle({ ...latest, replaceable, phase: exhausted ? 'unconfirmed' : 'checking' });
      }

      if (!exhausted) {
        timer = setTimeout(poll, PENDING_POLL_INTERVAL_MS);
      }
    };

    timer = setTimeout(poll, PENDING_POLL_INTERVAL_MS);

    return (): void => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [checkingRound, ownerId, repository, scope, setEntry, showToast, transactionService]);

  const watch = useCallback((hash: string, sender: Account, sentNetwork: Network): void => {
    // TransactionService normally saved it before broadcasting; only write when it is missing.
    const record = repository.find(sender.id, sentNetwork.chainId, hash)
      ?? repository.add({ hashes: [hash], accountId: sender.id, chainId: sentNetwork.chainId, createdAt: Date.now() });

    setEntry(pendingScope(sender.id, sentNetwork.chainId), {
      accountId: sender.id, network: sentNetwork, phase: 'checking', round: nextRound++, replaceable: false, ownerId, ownedRecordId: record.id,
    });
    showToast('Transaction sent. Waiting for confirmation.', 'info');
  }, [ownerId, repository, setEntry, showToast]);

  const track = useCallback((error: unknown, sender: Account, sentNetwork: Network): boolean => {
    if (!(error instanceof TransactionPendingError)) {
      return false;
    }

    watch(error.hash, sender, sentNetwork);
    return true;
  }, [watch]);

  const trackSubmitted = useCallback((result: BroadcastResult, sender: Account, sentNetwork: Network): void => {
    watch(result.hash, sender, sentNetwork);
  }, [watch]);

  const blocked = Boolean(pending || stored);
  const replaceable = blocked && Boolean(pending?.replaceable);

  return {
    canSend: !blocked || replaceable,
    replacesPending: replaceable,
    notice: !blocked ? undefined : replaceable ? REPLACEABLE_NOTICE : pending?.phase === 'unconfirmed' ? UNCONFIRMED_NOTICE : PENDING_NOTICE,
    track,
    trackSubmitted,
  };
};
