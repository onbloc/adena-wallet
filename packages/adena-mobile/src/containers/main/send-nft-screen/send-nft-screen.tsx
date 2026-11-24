import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { ReactElement, useRef, useState } from 'react';

import { SendNftPage } from '../../../components/pages';
import { toErrorMessage } from '../../../core/error-message';
import { useContainer } from '../../../di/container-provider';
import { Account } from '../../../domain/account';
import { FeeEstimate } from '../../../domain/fee';
import { Network } from '../../../domain/network';
import { TransactionDraft } from '../../../domain/transaction';
import { useFeeSelection } from '../../../hooks/use-fee-selection';
import { useWalletSnapshot } from '../../../hooks/use-wallet-snapshot';
import { MainStackParamList } from '../../../navigation/types';
import { useNftTokenUriQuery } from '../../../queries/nft.queries';
import { queryKeys } from '../../../queries/query-keys';
import { useToastStore } from '../../../stores/toast.store';

// Everything the review shows and the broadcast signs, captured when the fee was estimated.
interface PreparedNftTransfer {
  account: Account;
  network: Network;
  toAddress: string;
  draft: TransactionDraft;
  estimate: FeeEstimate;
}

export const SendNftScreen = ({ navigation, route }: NativeStackScreenProps<MainStackParamList, 'SendNft'>): ReactElement => {
  const { collection, item } = route.params;
  const { nftService, transactionService, accountService, addressBookService, chainRegistry } = useContainer();
  const { account, accounts, network } = useWalletSnapshot();
  const queryClient = useQueryClient();
  const showToast = useToastStore(state => state.show);
  const image = useNftTokenUriQuery(network, item.packagePath, item.nftId, collection.supportsTokenUri);
  const [recipient, setRecipient] = useState('');
  const [prepared, setPrepared] = useState<PreparedNftTransfer | null>(null);
  const sendingRef = useRef(false);
  const feeSelection = useFeeSelection(prepared?.estimate ?? null, network);

  const trimmed = recipient.trim();
  const ownAddress = account ? accountService.getAddress(account, network) : '';
  const valid = chainRegistry.forNetwork(network).isValidAddress(trimmed, network) && trimmed !== ownAddress;
  const suggestions = [
    ...addressBookService.getEntriesFor(network).map(entry => ({ key: entry.id, label: entry.name, address: entry.address })),
    ...accounts.filter(item2 => item2.id !== account?.id).map(other => ({ key: other.id, label: other.name, address: accountService.getAddress(other, network) })),
  ].filter(entry => !trimmed || entry.address.includes(trimmed) || entry.label.toLowerCase().includes(trimmed.toLowerCase()));

  // Results are applied through per-call callbacks, which reset() detaches, so an edit discards an in-flight estimate.
  const prepare = useMutation({
    mutationFn: async (): Promise<PreparedNftTransfer> => {
      if (!account) {
        throw new Error('No account selected');
      }

      const draft = nftService.createTransferDraft(account, network, item, trimmed);

      return { account, network, toAddress: trimmed, draft, estimate: await transactionService.estimateFee(draft, account, network) };
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      if (!prepared || !feeSelection.fee) {
        throw new Error('Nothing to send');
      }

      const draft = { ...prepared.draft, fee: { gasWanted: feeSelection.fee.gasWanted, gasFee: feeSelection.fee.gasFee } };

      await transactionService.assertSufficientFunds(draft, prepared.account, prepared.network);
      return transactionService.signAndBroadcast(draft, prepared.account, prepared.network);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nft-collections'] });
      queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'nft-items'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.balances() });
      showToast('NFT sent', 'success');
      navigation.popToTop();
    },
  });

  const handleChangeRecipient = (value: string): void => {
    setRecipient(value);
    prepare.reset();
  };

  const handleReview = (): void => prepare.mutate(undefined, {
    onSuccess: (result) => {
      feeSelection.reset();
      setPrepared(result);
    },
  });

  // isPending reaches the button a tick after mutate(); the ref blocks a second tap in between.
  const handleConfirm = (): void => {
    if (sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    send.mutateAsync()
      .catch(() => undefined)
      .finally(() => {
        sendingRef.current = false;
      });
  };

  const handleCloseReview = (): void => {
    send.reset();
    setPrepared(null);
  };

  return (
    <SendNftPage
      title={`${item.name} #${item.nftId}`}
      collectionName={collection.name}
      imageUri={image.data}
      recipient={recipient}
      onChangeRecipient={handleChangeRecipient}
      recipientError={trimmed && !valid ? (trimmed === ownAddress ? 'This is your current account.' : `Enter a valid ${network.chainName} address.`) : undefined}
      suggestions={valid ? [] : suggestions}
      onSelectSuggestion={handleChangeRecipient}
      canReview={valid}
      preparing={prepare.isPending}
      prepareError={prepare.error ? toErrorMessage(prepare.error) : undefined}
      onReview={handleReview}
      review={{
        visible: Boolean(prepared),
        rows: [
          { label: 'To', value: prepared?.toAddress ?? '', multiline: true },
          { label: 'Network', value: prepared?.network.networkName ?? network.networkName },
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
