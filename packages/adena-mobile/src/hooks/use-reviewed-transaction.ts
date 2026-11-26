import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';

import { FeeSelectorProps } from '../components/molecules';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import { BroadcastResult, TransactionFee } from '../domain/transaction';
import { queryKeys } from '../queries/query-keys';
import { OrderService, PreparedOrderTransaction } from '../services/order.service';
import { PreparedCardTransaction, SessionCardService } from '../services/session-card.service';
import { useToastStore } from '../stores/toast.store';
import { useFeeSelection } from './use-fee-selection';
import { usePendingBroadcast } from './use-pending-broadcast';
import { useWalletSnapshot } from './use-wallet-snapshot';

export interface ReviewedTarget {
  account: Account;
  network: Network;
  estimate: FeeEstimate;
}

export interface ReviewedTransaction<T extends ReviewedTarget> {
  prepared: T | null;
  fee: FeeSelectorProps;
  canSend: boolean;
  notice?: string;
  preparing: boolean;
  prepareError?: string;
  confirming: boolean;
  confirmError?: string;
  start: (prepare: () => Promise<T>) => void;
  confirm: () => void;
  close: () => void;
}

type Submit<T> = (prepared: T, fee: TransactionFee) => Promise<BroadcastResult>;

// Review then hold-to-confirm, signed by the current account; everything it may change is refreshed after.
export const useReviewedTransaction = <T extends ReviewedTarget>(
  submitTransaction: Submit<T>,
  successMessage: string,
  onCommitted: (prepared: T) => void,
): ReviewedTransaction<T> => {
  const { account, network } = useWalletSnapshot();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const [prepared, setPrepared] = useState<T | null>(null);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, prepared?.network ?? network);
  const sendingRef = useRef(false);

  const refresh = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'session-cards'] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'orders'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
  }, [queryClient]);

  // A tx of unknown outcome that later commits only refreshes; its screen may be gone by then.
  const pendingBroadcast = usePendingBroadcast(account, network, refresh);

  const prepare = useMutation({ mutationFn: (factory: () => Promise<T>) => factory() });

  const submit = useMutation({
    mutationFn: async (target: T) => {
      if (!feeSelection.fee) {
        throw new Error('The network fee is not ready');
      }

      return submitTransaction(target, { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee });
    },
  });

  const start = (factory: () => Promise<T>): void => {
    if (!pendingBroadcast.canSend) {
      return;
    }

    submit.reset();
    prepare.mutate(factory, {
      onSuccess: (result) => {
        feeSelection.reset();
        setPrepared(result);
      },
    });
  };

  // isPending reaches the button a tick after mutate(); the ref blocks a second hold in between.
  const confirm = (): void => {
    if (sendingRef.current || !prepared) {
      return;
    }

    const target = prepared;

    sendingRef.current = true;
    submit.mutateAsync(target)
      .then((result) => {
        if (!result.committed) {
          pendingBroadcast.trackSubmitted(result, target.account, target.network);
          setPrepared(null);
          return;
        }

        refresh();
        showToast(successMessage, 'success');
        setPrepared(null);
        onCommitted(target);
      }, (error) => {
        if (pendingBroadcast.track(error, target.account, target.network)) {
          submit.reset();
          setPrepared(null);
          refresh();
        }
      })
      .finally(() => {
        sendingRef.current = false;
      });
  };

  const close = (): void => {
    if (submit.isPending) {
      return;
    }

    submit.reset();
    setPrepared(null);
  };

  return {
    prepared,
    fee: feeSelection.selectorProps,
    canSend: pendingBroadcast.canSend,
    notice: pendingBroadcast.notice,
    preparing: prepare.isPending,
    prepareError: prepare.error ? toErrorMessage(prepare.error) : undefined,
    confirming: submit.isPending,
    confirmError: submit.error ? toErrorMessage(submit.error) : undefined,
    start,
    confirm,
    close,
  };
};

const submitCard = (service: SessionCardService): Submit<PreparedCardTransaction> => (prepared, fee) => service.submit(prepared, fee);

const submitOrder = (service: OrderService): Submit<PreparedOrderTransaction> => (prepared, fee) => service.submit(prepared, fee);

export type CardTransaction = ReviewedTransaction<PreparedCardTransaction>;

export type OrderTransaction = ReviewedTransaction<PreparedOrderTransaction>;

export const useCardTransaction = (successMessage: string, onCommitted: (prepared: PreparedCardTransaction) => void): CardTransaction =>
  useReviewedTransaction(submitCard(useContainer().sessionCardService), successMessage, onCommitted);

export const useOrderTransaction = (successMessage: string, onCommitted: (prepared: PreparedOrderTransaction) => void): OrderTransaction =>
  useReviewedTransaction(submitOrder(useContainer().orderService), successMessage, onCommitted);
