import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useCallback, useEffect, useRef, useState } from 'react';

import { SendNftPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { Account } from '../../../domain/account';
import { FeeEstimate } from '../../../domain/fee';
import { Network } from '../../../domain/network';
import { TransactionDraft } from '../../../domain/transaction';
import { useFeeSelection } from '../../../hooks/use-fee-selection';
import { usePendingBroadcast } from '../../../hooks/use-pending-broadcast';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useNftTokenUriQuery } from '../../../queries/nft.queries';
import { queryKeys } from '../../../queries/query-keys';
import { useToastStore } from '../../../stores/toast.store';
import { compareAmount, formatTokenAmount } from '../../../utils/amount';

// Everything the review shows and the broadcast signs, captured when the fee was estimated.
interface PreparedNftTransfer {
  account: Account;
  network: Network;
  toAddress: string;
  draft: TransactionDraft;
  estimate: FeeEstimate;
}

export const SendNftScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendNft'>): ReactElement => {
  const { collection, item, scannedAddress } = route.params;
  const { nftService, transactionService, accountService, addressBookService, chainRegistry } = useContainer();
  const { account, accounts, network } = useWalletSnapshot();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const image = useNftTokenUriQuery(network, item.packagePath, item.nftId, collection.supportsTokenUri);
  const [recipient, setRecipient] = useState('');
  const [prepared, setPrepared] = useState<PreparedNftTransfer | null>(null);
  const [appliedScan, setAppliedScan] = useState<string>();
  const sendingRef = useRef(false);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, network);

  const trimmed = recipient.trim();
  const ownAddress = account ? accountService.getAddress(account, network) : '';
  // Canonical lowercase form, so `G1…` input cannot slip past the self-send check and is what gets signed.
  const toAddress = trimmed ? chainRegistry.forNetwork(network).normalizeAddress(trimmed, network) : null;
  const isSelf = toAddress !== null && toAddress === ownAddress;
  const valid = toAddress !== null && !isSelf;
  const suggestions = [
    ...addressBookService.getEntriesFor(network).map(entry => ({ key: entry.id, label: entry.name, address: entry.address })),
    ...accounts.filter(item2 => item2.id !== account?.id).map(other => ({ key: other.id, label: other.name, address: accountService.getAddress(other, network) })),
  ].filter(entry => !trimmed || entry.address.includes(trimmed.toLowerCase()) || entry.label.toLowerCase().includes(trimmed.toLowerCase()));

  // Results are applied through per-call callbacks, which reset() detaches, so an edit discards an in-flight estimate.
  const prepare = useMutation({
    mutationFn: async (): Promise<PreparedNftTransfer> => {
      if (!account || !toAddress || !valid) {
        throw new Error('Enter a valid recipient');
      }

      const draft = nftService.createTransferDraft(account, network, item, toAddress);

      return { account, network, toAddress, draft, estimate: await transactionService.estimateFee(draft, account, network) };
    },
  });

  const resetPrepare = prepare.reset;

  const handleCommitted = useCallback((): void => {
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nft-collections'] });
    queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nft-items'] });
    queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
    showToast('NFT sent', 'success');
    navigation.popToTop();
  }, [navigation, queryClient, showToast]);

  const pendingBroadcast = usePendingBroadcast(handleCommitted);

  const send = useMutation({
    mutationFn: async () => {
      if (!prepared || !feeSelection.fee) {
        throw new Error('Nothing to send');
      }

      const draft = { ...prepared.draft, fee: { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee } };

      // The storage deposit is paid in the fee token on top of the fee, as for token sends.
      await transactionService.assertSufficientFunds(draft, prepared.account, prepared.network, undefined, prepared.estimate.storageDeposit);
      return transactionService.signAndBroadcast(draft, prepared.account, prepared.network);
    },
    onSuccess: handleCommitted,
  });

  const handleChangeRecipient = (value: string): void => {
    setRecipient(value);
    prepare.reset();
  };

  const handleScanRecipient = (): void => navigation.navigate('QrScanner', { returnKey: route.key });

  // The scanner writes its result onto this route; apply it once, then clear it so a repeat scan applies again.
  if (scannedAddress !== appliedScan) {
    setAppliedScan(scannedAddress);

    if (scannedAddress) {
      setRecipient(scannedAddress);
    }
  }

  useEffect(() => {
    if (scannedAddress) {
      resetPrepare();
      navigation.setParams({ scannedAddress: undefined });
    }
  }, [navigation, resetPrepare, scannedAddress]);

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

  const deposit = prepared?.estimate.storageDeposit ?? '0';
  const feeToken = prepared?.network.feeToken;
  const storageDeposit = feeToken && compareAmount(deposit, '0') > 0 ? `${formatTokenAmount(deposit, feeToken.decimals)} ${feeToken.symbol}` : undefined;

  return (
    <SendNftPage
      title={`${item.name} #${item.nftId}`}
      collectionName={collection.name}
      imageUri={image.data}
      recipient={recipient}
      onChangeRecipient={handleChangeRecipient}
      onScanRecipient={handleScanRecipient}
      recipientError={trimmed && !valid ? (isSelf ? 'This is your current account.' : `Enter a valid ${network.chainName} address.`) : undefined}
      suggestions={valid ? [] : suggestions}
      onSelectSuggestion={handleChangeRecipient}
      canReview={valid && pendingBroadcast.canSend}
      preparing={prepare.isPending}
      prepareError={prepare.error ? toErrorMessage(prepare.error) : undefined}
      notice={pendingBroadcast.notice}
      onReview={handleReview}
      review={{
        visible: Boolean(prepared),
        rows: [
          { label: 'To', value: prepared?.toAddress ?? '', multiline: true },
          { label: 'Network', value: prepared?.network.networkName ?? network.networkName },
          ...(storageDeposit ? [{ label: 'Storage deposit', value: storageDeposit }] : []),
        ],
        fee: feeSelection.selectorProps,
        error: send.error ? toErrorMessage(send.error) : undefined,
        confirming: send.isPending,
        onConfirm: handleConfirm,
        onClose: handleCloseReview,
      }}
      onBack={navigation.goBack}
    />
  );
};
