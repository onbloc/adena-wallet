import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useMemo, useState } from 'react';

import { applyKeypadKey, KeypadKey } from '../../../components/molecules';
import { SendAmountPage, TransferReview } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { FeeEstimate } from '../../../domain/fee';
import { TransactionDraft } from '../../../domain/transaction';
import { useFeeSelection } from '../../../hooks/use-fee-selection';
import { useWalletAssets } from '../../../hooks/use-wallet-assets';
import { MainStackParamList } from '../../../navigation/types';
import { queryKeys } from '../../../queries/query-keys';
import { useToastStore } from '../../../stores/toast.store';
import { addAmount, compareAmount, formatTokenAmount, isPositiveAmount, parseCoin, toBaseUnit, toDisplayAmount } from '../../../utils/amount';

export const SendAmountScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendAmount'>): ReactElement => {
  const { toAddress } = route.params;
  const { transactionService, accountService, addressBookService } = useContainer();
  const wallet = useWalletAssets();
  const { account, network } = wallet;
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);

  const [tokenId, setTokenId] = useState(route.params.tokenId ?? network.nativeToken.id);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [memoVisible, setMemoVisible] = useState(false);
  const [memo, setMemo] = useState('');
  const [amount, setAmount] = useState('');
  const [prepared, setPrepared] = useState<{ draft: TransactionDraft; estimate: FeeEstimate } | null>(null);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, network);

  const asset = wallet.assets.find(item => item.token.id === tokenId) ?? wallet.assets.find(item => item.token.isNative);
  const token = asset?.token;
  const decimals = token?.decimals ?? network.nativeToken.decimals;
  const balance = asset?.amount;
  const baseAmount = useMemo(() => (isPositiveAmount(amount) ? toBaseUnit(amount, decimals) : '0'), [amount, decimals]);
  const exceedsBalance = balance !== undefined && compareAmount(baseAmount, balance) > 0;
  const recipientName = addressBookService.findByAddress(toAddress)?.name
    ?? accountService.getAccounts().find(item => accountService.getAddress(item, network) === toAddress)?.name;

  const prepare = useMutation({
    mutationFn: async () => {
      if (!account || !token) {
        throw new Error('Select an account and token');
      }

      const draft = await transactionService.createTransferDraft({ account, network, token, toAddress, amount: baseAmount, memo });
      const estimate = await transactionService.estimateFee(draft, account, network);

      return { draft, estimate };
    },
    onSuccess: (result) => {
      feeSelection.reset();
      setPrepared(result);
    },
  });

  // Native coin: MAX leaves room for the network fee and storage deposit (extension parity).
  const max = useMutation({
    mutationFn: async () => {
      if (!account || !token || balance === undefined) {
        throw new Error('Select an account and token');
      }

      return transactionService.maxTransferAmount({ account, network, token, toAddress, balance });
    },
    onSuccess: maxAmount => setAmount(compareAmount(maxAmount, '0') > 0 ? toDisplayAmount(maxAmount, decimals) : ''),
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!account || !prepared || !feeSelection.fee || !token) {
        throw new Error('Nothing to send');
      }

      const draft = { ...prepared.draft, fee: { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee } };

      await transactionService.assertSufficientFunds(draft, account, network, { token, amount: baseAmount }, prepared.estimate.storageDeposit);
      return transactionService.signAndBroadcast(draft, account, network);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'activities'] });
      showToast('Transaction confirmed', 'success');
      setPrepared(null);
      navigation.popToTop();
    },
  });

  const review: TransferReview | undefined = useMemo(() => {
    if (!prepared || !token || !feeSelection.fee) {
      return undefined;
    }

    const feeToken = network.feeToken;
    const fee = addAmount(parseCoin(feeSelection.fee.gasFee)?.amount ?? '0', prepared.estimate.storageDeposit ?? '0');

    return {
      amountLabel: `${formatTokenAmount(baseAmount, token.decimals)} ${token.symbol}`,
      recipientAddress: toAddress,
      networkName: network.networkName,
      // A total only makes sense when the amount and the fee are the same coin.
      totalLabel: token.denom === feeToken.denom ? `${formatTokenAmount(addAmount(baseAmount, fee), feeToken.decimals)} ${feeToken.symbol}` : undefined,
      fee: feeSelection.selectorProps,
    };
  }, [baseAmount, feeSelection.fee, feeSelection.selectorProps, network.feeToken, network.networkName, prepared, toAddress, token]);

  const handleKeyPress = (key: KeypadKey): void => {
    prepare.reset();
    max.reset();
    setAmount(current => applyKeypadKey(current, key, decimals));
  };

  const handleMax = (): void => {
    prepare.reset();
    max.mutate();
  };

  const handleReview = (): void => prepare.mutate();

  const handleConfirm = (): void => send.mutate();

  const handleCloseReview = (): void => {
    send.reset();
    setPrepared(null);
  };

  const handleOpenMemo = (): void => setMemoVisible(true);

  const handleCloseMemo = (): void => setMemoVisible(false);

  const handleOpenTokenPicker = (): void => setPickerVisible(true);

  const handleCloseTokenPicker = (): void => setPickerVisible(false);

  const handleSelectToken = (nextTokenId: string): void => {
    setTokenId(nextTokenId);
    setAmount('');
    prepare.reset();
    setPickerVisible(false);
  };

  return (
    <SendAmountPage
      amount={amount}
      symbol={token?.symbol ?? network.nativeToken.symbol}
      available={balance !== undefined ? formatTokenAmount(balance, decimals) : undefined}
      recipientAddress={toAddress}
      recipientLabel={recipientName ?? 'Recipient'}
      error={exceedsBalance
        ? 'Insufficient balance'
        : prepare.error
          ? toErrorMessage(prepare.error)
          : max.error ? toErrorMessage(max.error) : undefined}
      canReview={isPositiveAmount(amount) && !exceedsBalance && Boolean(token)}
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
      onChangeMemo={setMemo}
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
