import { useState, useMemo, useCallback } from 'react';
import { MsgEndpoint } from '@gnolang/gno-js-client';

import { useAdenaContext, useWalletContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { RoutePath } from '@types';
import useAppNavigate from '@hooks/use-app-navigate';

import { MultisigTransactionDocument, Signature } from '@inject/types';
import { makeGnotAmountByRaw } from '@common/utils/amount-utils';
import { isMultisigAccount } from 'adena-module';

export type BroadcastTransactionState = 'UPLOAD_TRANSACTION' | 'LOADING' | 'FAILED' | 'SUCCESS';

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

  // Type
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

  // Network Fee
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
        if (!from_address) {
          return true;
        }
        return from_address !== caller;
      }
      case MsgEndpoint.MSG_CALL:
      case MsgEndpoint.MSG_RUN: {
        const { caller: msgCaller } = message.value;
        if (!msgCaller) {
          return true;
        }
        return msgCaller !== caller;
      }
      case MsgEndpoint.MSG_ADD_PKG: {
        const { creator } = message.value;
        if (!creator) {
          return true;
        }
        return creator !== caller;
      }
      default: {
        return true;
      }
    }
  });

  return !invalidedMatch;
}

export interface UseBroadcastMultisigTransactionScreenReturn {
  multisigTransactionDocument: MultisigTransactionDocument | null;
  transactionInfos: TransactionDisplayInfo[] | null;
  rawTransaction: string;
  uploadMultisigTransaction: (text: string) => boolean;
  signatures: Signature[];
  uploadSignature: (text: string) => boolean;
  removeSignature: (pubKeyValue: string) => void;
  clearSignatures: () => void;
  broadcastTransactionState: BroadcastTransactionState;
  broadcast: () => Promise<boolean>;
}

const useBroadcastMultisigTransactionScreen = (): UseBroadcastMultisigTransactionScreenReturn => {
  const { wallet } = useWalletContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { multisigService } = useAdenaContext();
  const { navigate } = useAppNavigate();

  const [multisigTransactionDocument, setMultisigTransactionDocument] =
    useState<MultisigTransactionDocument | null>(null);
  const [signatures, setSignatures] = useState<Signature[]>([]);

  const [broadcastTransactionState, setBroadcastTransactionState] =
    useState<BroadcastTransactionState>('UPLOAD_TRANSACTION');

  const transactionInfos = useMemo(() => {
    if (!multisigTransactionDocument || multisigTransactionDocument.tx.msgs.length === 0) {
      return null;
    }
    return mapMultisigTransactionInfo(multisigTransactionDocument);
  }, [multisigTransactionDocument]);

  // Raw Transaction (JSON string)
  const rawTransaction = useMemo(() => {
    if (!multisigTransactionDocument) {
      return '';
    }
    return JSON.stringify(multisigTransactionDocument, null, 2);
  }, [multisigTransactionDocument]);

  const uploadMultisigTransaction = (text: string): boolean => {
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
        return false;
      }

      setMultisigTransactionDocument(multisigTxDoc);
      return true;
    } catch (error) {
      console.error(error);
      setMultisigTransactionDocument(null);
      return false;
    }
  };

  const uploadSignature = (text: string): boolean => {
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
        return false;
      }

      setSignatures((prev) => [...prev, signature]);
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  };

  const removeSignature = (pubKeyValue: string): void => {
    setSignatures((prev) => prev.filter((sig) => sig.pub_key.value !== pubKeyValue));
  };

  const clearSignatures = (): void => {
    setSignatures([]);
  };

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
        navigate(RoutePath.History);
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
  }, [currentAccount, multisigTransactionDocument, signatures]);

  return {
    multisigTransactionDocument,
    transactionInfos,
    rawTransaction,
    uploadMultisigTransaction,
    signatures,
    uploadSignature,
    removeSignature,
    clearSignatures,
    broadcastTransactionState,
    broadcast,
  };
};

export default useBroadcastMultisigTransactionScreen;
