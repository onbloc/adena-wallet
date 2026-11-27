import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { TransferReviewSheetProps } from '../components/molecules';
import { toErrorMessage } from '../core/error-message';
import { useContainer } from '../di/container-provider';
import { Account } from '../domain/account';
import { AiTransferDraft, AiTransferOutcome } from '../domain/ai';
import { FeeEstimate } from '../domain/fee';
import { Network } from '../domain/network';
import { queryKeys } from '../queries/query-keys';
import { useTokenPricesQuery } from '../queries/token.queries';
import { PriceService } from '../services/price.service';
import { useToastStore } from '../stores/toast.store';
import { addAmount, formatTokenAmount, parseCoin } from '../utils/amount';
import { useFeeSelection } from './use-fee-selection';
import { usePendingBroadcast } from './use-pending-broadcast';

interface ReviewState {
  transfer: AiTransferDraft;
  estimate: FeeEstimate;
  replacesPending: boolean;
}

export type AiTransferSettled = (id: string, outcome: Exclude<AiTransferOutcome, 'dismissed'>, message?: string) => void;

export const useAiTransferReview = (
  account: Account | null,
  network: Network,
  onSettled: AiTransferSettled,
): { review?: TransferReviewSheetProps; activeId?: string; open: (draft: AiTransferDraft) => Promise<void>; invalidate: () => void } => {
  const { transactionService, accountService, networkService, keyringSession } = useContainer();
  const queryClient = useQueryClient();
  const toast = useToastStore(state => state.show);
  const [prepared, setPrepared] = useState<ReviewState>();
  const [error, setError] = useState<string>();
  const [confirming, setConfirming] = useState(false);
  const operationRef = useRef(0);
  const sendingRef = useRef(false);
  const liveRef = useRef(true);
  const fee = useFeeSelection(prepared?.estimate ?? null, prepared?.transfer.network ?? network);
  const prices = useTokenPricesQuery(prepared?.transfer.network ?? network, prepared ? [prepared.transfer.token] : []);
  const committed = useCallback((): void => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    void queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
    toast('Transaction confirmed', 'success');
  }, [queryClient, toast]);
  const pending = usePendingBroadcast(account, network, committed);

  const assertScope = (transfer: AiTransferDraft): void => {
    const selected = accountService.getCurrentAccount();
    const current = networkService.getCurrentNetwork();

    if (!liveRef.current || !keyringSession.isUnlocked() || AppState.currentState === 'background'
      || selected?.id !== transfer.account.id || selected.publicKey !== transfer.account.publicKey
      || current.id !== transfer.network.id || current.chainId !== transfer.network.chainId
      || current.rpcUrl !== transfer.network.rpcUrl) {
      throw new Error('Wallet context changed. Prepare the transfer again.');
    }
  };

  const invalidate = useCallback((): void => {
    operationRef.current++;
    setPrepared(undefined);
    setError(undefined);
  }, []);

  useEffect(() => {
    liveRef.current = true;

    return (): void => {
      liveRef.current = false;
      operationRef.current++;
    };
  }, []);

  const open = async (transfer: AiTransferDraft): Promise<void> => {
    if (sendingRef.current) {
      return;
    }

    assertScope(transfer);

    if (!pending.canSend) {
      throw new Error(pending.notice ?? 'A previous transaction is not confirmed yet.');
    }

    const token = ++operationRef.current;
    const estimate = await transactionService.estimateFee(transfer.draft, transfer.account, transfer.network, { signing: false });

    if (token !== operationRef.current) {
      return;
    }

    assertScope(transfer);
    fee.reset();
    setError(undefined);
    setPrepared({ transfer, estimate, replacesPending: pending.replacesPending });
  };

  const confirm = async (): Promise<void> => {
    if (sendingRef.current || !prepared || !fee.fee || fee.fee.tooLow) {
      return;
    }

    const { transfer, estimate, replacesPending } = prepared;
    const token = operationRef.current;
    let signed = false;

    sendingRef.current = true;
    setConfirming(true);
    setError(undefined);

    try {
      assertScope(transfer);

      if (!pending.canSend) {
        throw new Error(pending.notice ?? 'A previous transaction is not confirmed yet.');
      }

      const draft = { ...transfer.draft, fee: { gasWanted: fee.fee.gasWanted, gasFee: fee.fee.gasFee } };

      await transactionService.assertSufficientFunds(draft, transfer.account, transfer.network, { token: transfer.token, amount: transfer.amount }, estimate.storageDeposit);

      if (token !== operationRef.current) {
        return;
      }

      assertScope(transfer);

      const result = await transactionService.signAndBroadcast(draft, transfer.account, transfer.network, {
        replacePending: replacesPending,
        onSigned: (): void => { signed = true; },
      });

      if (result.committed) {
        committed();
        onSettled(transfer.id, 'sent');
      }
      else {
        pending.trackSubmitted(result, transfer.account, transfer.network);
        onSettled(transfer.id, 'submitted', 'Submitted. Confirmation is pending.');
      }

      setPrepared(undefined);
    }
    catch (failure) {
      if (pending.track(failure, transfer.account, transfer.network) || signed) {
        onSettled(transfer.id, 'unconfirmed', 'Outcome not confirmed. Check Activity before sending again.');
        setPrepared(undefined);
      }
      else if (token === operationRef.current && liveRef.current) {
        setError(toErrorMessage(failure));
      }
    }
    finally {
      sendingRef.current = false;

      if (liveRef.current) {
        setConfirming(false);
      }
    }
  };

  let review: TransferReviewSheetProps | undefined;

  if (prepared && fee.fee) {
    const { transfer, estimate } = prepared;
    const { token } = transfer;
    const fees = addAmount(parseCoin(fee.fee.gasFee)?.amount ?? '0', estimate.storageDeposit ?? '0');
    // A total only makes sense when the amount and the fee are the same coin.
    const total = token.denom === transfer.network.feeToken.denom ? addAmount(transfer.amount, fees) : undefined;
    const recipientName = transfer.recipientName
      ?? accountService.getAccounts().find(item => accountService.getAddress(item, transfer.network) === transfer.toAddress)?.name;

    review = {
      review: {
        amountLabel: `${formatTokenAmount(transfer.amount, token.decimals)} ${token.symbol}`,
        amountFiatLabel: PriceService.fiatLabel(transfer.amount, token, prices.data),
        recipientName,
        recipientAddress: transfer.toAddress,
        networkName: transfer.network.networkName,
        tokenRealm: token.pkgPath,
        totalLabel: total === undefined ? undefined : `${formatTokenAmount(total, token.decimals)} ${token.symbol}`,
        totalFiatLabel: total === undefined ? undefined : PriceService.fiatLabel(total, token, prices.data),
        fee: fee.selectorProps,
      },
      symbol: token.symbol,
      tokenLocalIcon: token.localIcon,
      tokenImageUrl: token.imageUrl,
      error,
      confirming,
      onConfirm: (): void => { void confirm(); },
      onClose: (): void => {
        if (!sendingRef.current) {
          invalidate();
        }
      },
    };
  }

  return { review, activeId: prepared?.transfer.id, open, invalidate };
};
