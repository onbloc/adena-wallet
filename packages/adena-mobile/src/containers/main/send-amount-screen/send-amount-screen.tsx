import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useMemo, useRef, useState } from 'react';

import { applyKeypadKey, KeypadKey } from '../../../components/molecules';
import { SendAmountPage, TransferReview } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { Account } from '../../../domain/account';
import { FeeEstimate } from '../../../domain/fee';
import { Network } from '../../../domain/network';
import { Token, tokenPriceKey } from '../../../domain/token';
import { TransactionDraft } from '../../../domain/transaction';
import { useFeeSelection } from '../../../hooks/use-fee-selection';
import { usePendingBroadcast } from '../../../hooks/use-pending-broadcast';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { queryKeys } from '../../../queries/query-keys';
import { PriceService } from '../../../services/price.service';
import { useToastStore } from '../../../stores/toast.store';
import { addAmount, compareAmount, formatTokenAmount, isPositiveAmount, parseCoin, toBaseUnit, toDisplayAmount } from '../../../utils/amount';
import { formatUSD } from '../../../utils/price';

// Everything the review shows and the broadcast signs, captured when the fee was estimated.
interface PreparedTransfer {
  account: Account;
  network: Network;
  token: Token;
  amount: string;
  memo: string;
  draft: TransactionDraft;
  estimate: FeeEstimate;
}

export const SendAmountScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendAmount'>): ReactElement => {
  const { toAddress } = route.params;
  const { transactionService, accountService, addressBookService } = useContainer();
  const wallet = useWalletAssets();
  const { account, network } = wallet;
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);

  const requestedTokenId = route.params.tokenId;
  const [tokenId, setTokenId] = useState(requestedTokenId ?? network.nativeToken.id);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [memoVisible, setMemoVisible] = useState(false);
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [prepared, setPrepared] = useState<PreparedTransfer | null>(null);
  const sendingRef = useRef(false);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, network);
  const { prices } = wallet;

  const fiatOf = useCallback((value: string, of: Token): string | undefined => {
    const usd = PriceService.valueOf(value, of, prices?.[tokenPriceKey(of.id, of.networkId)]);

    return usd === null ? undefined : `≈ ${formatUSD(usd)}`;
  }, [prices]);

  // A requested token that is not listed (e.g. hidden) is reported instead of silently sending the native coin.
  const asset = wallet.assets.find(item => item.token.id === tokenId)
    ?? (tokenId === requestedTokenId ? undefined : wallet.assets.find(item => item.token.isNative));
  const tokenUnavailable = !asset && !wallet.loading && tokenId === requestedTokenId;
  const token = asset?.token;
  const decimals = token?.decimals ?? network.nativeToken.decimals;
  const balance = asset?.amount;
  const baseAmount = useMemo(() => (isPositiveAmount(amount) ? toBaseUnit(amount, decimals) : '0'), [amount, decimals]);
  const exceedsBalance = balance !== undefined && compareAmount(baseAmount, balance) > 0;
  const recipientName = addressBookService.findByAddress(toAddress)?.name
    ?? accountService.getAccounts().find(item => accountService.getAddress(item, network) === toAddress)?.name;

  // Results are applied through per-call callbacks, which reset() detaches, so an edit discards an in-flight estimate.
  const prepare = useMutation({
    mutationFn: async (): Promise<PreparedTransfer> => {
      if (!account || !token) {
        throw new Error('Select an account and token');
      }

      const input = { account, network, token, amount: baseAmount, memo };
      const draft = await transactionService.createTransferDraft({ ...input, toAddress });
      const estimate = await transactionService.estimateFee(draft, account, network);

      return { ...input, draft, estimate };
    },
  });

  // Native coin: MAX leaves room for the network fee and storage deposit (extension parity).
  const max = useMutation({
    mutationFn: async () => {
      if (!account || !token || balance === undefined) {
        throw new Error('Select an account and token');
      }

      const maxAmount = await transactionService.maxTransferAmount({ account, network, token, toAddress, balance });

      return compareAmount(maxAmount, '0') > 0 ? toDisplayAmount(maxAmount, token.decimals) : '';
    },
  });

  const handleCommitted = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
    showToast('Transaction confirmed', 'success');
    setPrepared(null);
    navigation.popToTop();
  }, [navigation, queryClient, showToast]);

  const pendingBroadcast = usePendingBroadcast(handleCommitted);

  const send = useMutation({
    mutationFn: async () => {
      if (!prepared || !feeSelection.fee) {
        throw new Error('Nothing to send');
      }

      const draft = { ...prepared.draft, fee: { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee } };
      const transfer = { token: prepared.token, amount: prepared.amount };

      await transactionService.assertSufficientFunds(draft, prepared.account, prepared.network, transfer, prepared.estimate.storageDeposit);
      return transactionService.signAndBroadcast(draft, prepared.account, prepared.network);
    },
    onSuccess: handleCommitted,
  });

  const review: TransferReview | undefined = useMemo(() => {
    if (!prepared || !feeSelection.fee) {
      return undefined;
    }

    const { token: sent, amount: sentAmount, network: sentNetwork } = prepared;
    const feeToken = sentNetwork.feeToken;
    const fee = addAmount(parseCoin(feeSelection.fee.gasFee)?.amount ?? '0', prepared.estimate.storageDeposit ?? '0');

    // A total only makes sense when the amount and the fee are the same coin.
    const total = sent.denom === feeToken.denom ? addAmount(sentAmount, fee) : undefined;

    return {
      amountLabel: `${formatTokenAmount(sentAmount, sent.decimals)} ${sent.symbol}`,
      amountFiatLabel: fiatOf(sentAmount, sent),
      recipientName,
      recipientAddress: toAddress,
      networkName: sentNetwork.networkName,
      memo: prepared.memo,
      totalLabel: total !== undefined ? `${formatTokenAmount(total, feeToken.decimals)} ${feeToken.symbol}` : undefined,
      totalFiatLabel: total !== undefined ? fiatOf(total, sent) : undefined,
      fee: feeSelection.selectorProps,
    };
  }, [feeSelection.fee, feeSelection.selectorProps, prepared, toAddress, recipientName, fiatOf]);

  const handleKeyPress = (key: KeypadKey): void => {
    prepare.reset();
    max.reset();
    setAmount(current => applyKeypadKey(current, key, decimals));
  };

  const handleMax = (): void => {
    prepare.reset();
    max.mutate(undefined, { onSuccess: setAmount });
  };

  const handleReview = (): void => {
    if (!pendingBroadcast.canSend) {
      return;
    }

    prepare.mutate(undefined, {
      onSuccess: (result) => {
        feeSelection.reset();
        setPrepared(result);
      },
    });
  };

  // isPending reaches the button a tick after mutate(); the ref blocks a second tap in between.
  const handleConfirm = (): void => {
    if (sendingRef.current || !prepared) {
      return;
    }

    const sentNetwork = prepared.network;

    sendingRef.current = true;
    send.mutateAsync()
      .catch((error) => {
        // Unknown outcome: close the review so the same draft cannot be confirmed again.
        if (pendingBroadcast.track(error, sentNetwork)) {
          send.reset();
          setPrepared(null);
        }
      })
      .finally(() => {
        sendingRef.current = false;
      });
  };

  const handleCloseReview = (): void => {
    send.reset();
    setPrepared(null);
  };

  const handleChangeMemo = (value: string): void => {
    prepare.reset();
    setMemo(value);
  };

  const handleOpenMemo = (): void => setMemoVisible(true);

  const handleCloseMemo = (): void => setMemoVisible(false);

  const handleOpenTokenPicker = (): void => setPickerVisible(true);

  const handleCloseTokenPicker = (): void => setPickerVisible(false);

  const handleSelectToken = (nextTokenId: string): void => {
    setTokenId(nextTokenId);
    setAmount('');
    prepare.reset();
    max.reset();
    setPickerVisible(false);
  };

  return (
    <SendAmountPage
      amount={amount}
      symbol={token?.symbol ?? network.nativeToken.symbol}
      tokenLocalIcon={token?.localIcon}
      tokenImageUrl={token?.imageUrl}
      fiatLabel={token ? fiatOf(baseAmount, token) : undefined}
      available={balance !== undefined ? formatTokenAmount(balance, decimals) : undefined}
      recipientAddress={toAddress}
      recipientLabel={recipientName ?? 'Recipient'}
      onChangeRecipient={navigation.goBack}
      error={tokenUnavailable
        ? 'This token isn’t in your token list. Turn it on in Manage tokens or pick another token.'
        : exceedsBalance
          ? 'Insufficient balance'
          : prepare.error
            ? toErrorMessage(prepare.error)
            : max.error ? toErrorMessage(max.error) : undefined}
      notice={pendingBroadcast.notice}
      canReview={isPositiveAmount(amount) && !exceedsBalance && Boolean(token) && pendingBroadcast.canSend}
      preparing={prepare.isPending || max.isPending}
      onKeyPress={handleKeyPress}
      onMax={handleMax}
      onReview={handleReview}
      onBack={navigation.goBack}
      review={review}
      confirming={send.isPending}
      reviewError={send.error ? toErrorMessage(send.error) : undefined}
      onConfirm={handleConfirm}
      onCloseReview={handleCloseReview}
      memo={memo}
      onChangeMemo={handleChangeMemo}
      memoSheetVisible={memoVisible}
      onOpenMemo={handleOpenMemo}
      onCloseMemo={handleCloseMemo}
      tokenOptions={wallet.assets.map(item => ({
        key: item.token.id,
        symbol: item.token.symbol,
        name: item.token.name,
        balanceLabel: item.quantityLabel,
      }))}
      tokenPickerVisible={pickerVisible}
      onOpenTokenPicker={handleOpenTokenPicker}
      onCloseTokenPicker={handleCloseTokenPicker}
      onSelectToken={handleSelectToken}
    />
  );
};
