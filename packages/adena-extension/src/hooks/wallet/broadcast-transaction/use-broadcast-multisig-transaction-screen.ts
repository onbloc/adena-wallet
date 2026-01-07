import { useState, useMemo, useCallback } from 'react';
import { MsgEndpoint } from '@gnolang/gno-js-client';

import {
  useAdenaContext,
  useWalletContext,
  useMultisigTransactionContext,
} from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

import { MultisigTransactionDocument, Signature } from '@inject/types';
import { makeGnotAmountByRaw } from '@common/utils/amount-utils';
import { isMultisigAccount, SignerPublicKeyInfo } from 'adena-module';

export type BroadcastTransactionState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED';

export interface TransactionDisplayInfo {
  name: string;
  value: string;
  type: 'TEXT' | 'COIN' | 'ADDRESS';
  extra: string | null;
}

function makeTransactionInfo(
  name: string,
  value: string,
  type: 'TEXT' | 'COIN' | 'ADDRESS' = 'TEXT',
  extra: string | null = null,
): TransactionDisplayInfo {
  return {
    name,
    value,
    type,
    extra,
  };
}

function makeTypeName(msgType: string): string {
  switch (msgType) {
    case MsgEndpoint.MSG_SEND:
      return 'Send';
    case MsgEndpoint.MSG_CALL:
      return 'Contract Interaction';
    case MsgEndpoint.MSG_ADD_PKG:
      return 'Add Package';
    case MsgEndpoint.MSG_RUN:
      return 'Run Transaction';
    default:
      return 'Contract Interaction';
  }
}

function mapMultisigTransactionInfo(
  multisigTxDoc: MultisigTransactionDocument,
): TransactionDisplayInfo[] {
  const { tx } = multisigTxDoc;
  const messages = tx.msgs;
  const extraInfo = messages.length > 1 ? `${messages.length}` : null;

  const firstMessage = messages[0];
  const infos: TransactionDisplayInfo[] = [];

  infos.push(makeTransactionInfo('Type', makeTypeName(firstMessage.type), 'TEXT', extraInfo));

  switch (firstMessage.type) {
    case MsgEndpoint.MSG_SEND: {
      const { to_address, amount } = firstMessage.value;
      const amountValue = makeGnotAmountByRaw(amount);
      const amountStr = `${amountValue?.value} ${amountValue?.denom}`;
      infos.push(makeTransactionInfo('To', to_address, 'ADDRESS'));
      infos.push(makeTransactionInfo('Amount', amountStr));
      break;
    }
    case MsgEndpoint.MSG_CALL: {
      const { pkg_path, func } = firstMessage.value;
      infos.push(makeTransactionInfo('Path', pkg_path));
      infos.push(makeTransactionInfo('Function', func));
      break;
    }
    case MsgEndpoint.MSG_ADD_PKG: {
      const { package: pkg } = firstMessage.value;
      infos.push(makeTransactionInfo('Path', pkg.path || pkg.Path));
      infos.push(makeTransactionInfo('Name', pkg.name || pkg.Name));
      break;
    }
    case MsgEndpoint.MSG_RUN: {
      const { package: pkg } = firstMessage.value;
      if (pkg) {
        infos.push(makeTransactionInfo('Path', pkg.path || pkg.Path));
        infos.push(makeTransactionInfo('Name', pkg.name || pkg.Name));
      }
      break;
    }
  }

  const networkFee = makeGnotAmountByRaw(tx.fee.gas_fee);
  const networkFeeStr = `${networkFee?.value} ${networkFee?.denom}`;
  infos.push(makeTransactionInfo('Network Fee', networkFeeStr));

  return infos;
}

function matchMultisigTransactionCaller(
  multisigTxDoc: MultisigTransactionDocument,
  caller: string,
): boolean {
  const messages = multisigTxDoc.tx.msgs;

  const invalidedMatch = messages.some((message) => {
    switch (message.type) {
      case MsgEndpoint.MSG_SEND: {
        const { from_address } = message.value;
        if (!from_address) return true;
        return from_address !== caller;
      }
      case MsgEndpoint.MSG_CALL:
      case MsgEndpoint.MSG_RUN: {
        const { caller: msgCaller } = message.value;
        if (!msgCaller) return true;
        return msgCaller !== caller;
      }
      case MsgEndpoint.MSG_ADD_PKG: {
        const { creator } = message.value;
        if (!creator) return true;
        return creator !== caller;
      }
      default:
        return true;
    }
  });

  return !invalidedMatch;
}

export interface UseBroadcastMultisigTransactionScreenReturn {
  broadcastTransactionState: BroadcastTransactionState;
  broadcast: () => Promise<boolean>;
  uploadMultisigTransaction: (text: string) => boolean;
  uploadSignature: (text: string) => boolean;
  transactionInfos: TransactionDisplayInfo[] | null;
  rawTransaction: string;
  signerPublicKeys: SignerPublicKeyInfo[];
  threshold: number;
}

const useBroadcastMultisigTransactionScreen = (): UseBroadcastMultisigTransactionScreenReturn => {
  const { wallet } = useWalletContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { multisigService } = useAdenaContext();

  const { multisigTransactionDocument, setMultisigTransactionDocument, signatures, addSignature } =
    useMultisigTransactionContext();

  const [broadcastTransactionState, setBroadcastTransactionState] =
    useState<BroadcastTransactionState>('IDLE');

  const signerPublicKeys = useMemo((): SignerPublicKeyInfo[] => {
    if (!currentAccount || !isMultisigAccount(currentAccount)) {
      return [];
    }

    return currentAccount.signerPublicKeys;
  }, [currentAccount]);

  const threshold = useMemo((): number => {
    if (!currentAccount || !isMultisigAccount(currentAccount)) {
      return 1;
    }

    return currentAccount.threshold;
  }, [currentAccount]);

  const transactionInfos = useMemo(() => {
    if (!multisigTransactionDocument || multisigTransactionDocument.tx.msgs.length === 0) {
      return null;
    }
    return mapMultisigTransactionInfo(multisigTransactionDocument);
  }, [multisigTransactionDocument]);

  const rawTransaction = useMemo(() => {
    if (!multisigTransactionDocument) {
      return '';
    }
    return JSON.stringify(multisigTransactionDocument, null, 2);
  }, [multisigTransactionDocument]);

  const uploadMultisigTransaction = useCallback(
    (text: string): boolean => {
      if (!currentAddress) {
        return false;
      }

      try {
        const multisigTxDoc = JSON.parse(text) as MultisigTransactionDocument;

        if (
          !multisigTxDoc.tx ||
          !multisigTxDoc.chainId ||
          !multisigTxDoc.accountNumber ||
          !multisigTxDoc.sequence
        ) {
          return false;
        }

        const { tx } = multisigTxDoc;

        if (
          !tx.msgs ||
          !Array.isArray(tx.msgs) ||
          tx.msgs.length === 0 ||
          !tx.fee ||
          !tx.fee.gas_wanted ||
          !tx.fee.gas_fee ||
          tx.signatures !== null
        ) {
          return false;
        }

        const validMessages = tx.msgs.every((msg) => {
          if (!msg.type || !msg.value) {
            return false;
          }
          return (
            msg.type === MsgEndpoint.MSG_SEND ||
            msg.type === MsgEndpoint.MSG_CALL ||
            msg.type === MsgEndpoint.MSG_ADD_PKG ||
            msg.type === MsgEndpoint.MSG_RUN
          );
        });

        if (!validMessages) {
          return false;
        }

        if (!matchMultisigTransactionCaller(multisigTxDoc, currentAddress)) {
          console.log('Caller mismatch warning');
        }

        setMultisigTransactionDocument(multisigTxDoc);
        return true;
      } catch (error) {
        console.error(error);
        setMultisigTransactionDocument(null);
        return false;
      }
    },
    [currentAddress, setMultisigTransactionDocument],
  );

  const uploadSignature = useCallback(
    (text: string): boolean => {
      try {
        const signature = JSON.parse(text) as Signature;

        if (
          !signature.pub_key ||
          signature.pub_key.type !== '/tm.PubKeySecp256k1' ||
          !signature.pub_key.value ||
          !signature.signature
        ) {
          return false;
        }

        const isDuplicate = signatures.some((sig) => sig.pub_key.value === signature.pub_key.value);

        if (isDuplicate) {
          console.warn('Duplicate signature');
          return false;
        }

        addSignature(signature);
        return true;
      } catch (error) {
        console.error(error);
        return false;
      }
    },
    [signatures, addSignature, signerPublicKeys],
  );

  const broadcast = useCallback(async () => {
    if (!multisigTransactionDocument || !signatures || !wallet || !currentAccount) {
      return false;
    }
    if (!isMultisigAccount(currentAccount)) {
      return false;
    }

    setBroadcastTransactionState('LOADING');
    try {
      const combinedTx = await multisigService.combineMultisigSignatures(
        currentAccount,
        multisigTransactionDocument,
        signatures,
      );

      const broadcastResult = await multisigService.broadcastTxCommit(combinedTx.tx);

      const isSuccessBroadcasting =
        broadcastResult?.hash &&
        broadcastResult.check_tx?.ResponseBase?.Error === null &&
        broadcastResult.deliver_tx?.ResponseBase?.Error === null;

      if (isSuccessBroadcasting) {
        setBroadcastTransactionState('SUCCESS');
        return true;
      } else {
        setBroadcastTransactionState('FAILED');
        return false;
      }
    } catch (e) {
      console.error(e);
      setBroadcastTransactionState('FAILED');
      return false;
    }
  }, [currentAccount, multisigTransactionDocument, signatures, wallet, multisigService]);

  return {
    broadcastTransactionState,
    broadcast,
    uploadMultisigTransaction,
    uploadSignature,
    transactionInfos,
    rawTransaction,
    signerPublicKeys,
    threshold,
  };
};

export default useBroadcastMultisigTransactionScreen;
