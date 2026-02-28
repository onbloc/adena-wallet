import { MsgEndpoint } from '@gnolang/gno-js-client';
import { useCallback, useMemo, useState } from 'react';

import {
  useAdenaContext,
  useMultisigTransactionContext,
  useWalletContext,
} from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

import { makeGnotAmountByRaw } from '@common/utils/amount-utils';
import { Signature } from '@inject/types';
import {
  isMultisigAccount,
  RawBankSendMessage,
  RawTx,
  RawVmAddPackageMessage,
  RawVmCallMessage,
  RawVmRunMessage,
  SignerPublicKeyInfo,
} from 'adena-module';

export type BroadcastTransactionState = 'IDLE' | 'LOADING' | 'SUCCESS' | 'FAILED';

export type SignatureUploadError = 'INVALID_FORMAT' | 'INVALID_SIGNER' | 'DUPLICATE' | null;

export interface SignatureUploadResult {
  success: boolean;
  error: SignatureUploadError;
}

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

function mapMultisigTransactionInfo(transaction: RawTx): TransactionDisplayInfo[] {
  const messages = transaction.msg;
  const extraInfo = messages.length > 1 ? `${messages.length}` : null;

  const firstMessage = messages[0];
  const firstMessageType = firstMessage['@type'];
  const infos: TransactionDisplayInfo[] = [];

  infos.push(makeTransactionInfo('Type', makeTypeName(firstMessageType), 'TEXT', extraInfo));

  switch (firstMessageType) {
    case MsgEndpoint.MSG_SEND: {
      const { to_address, amount } = firstMessage as RawBankSendMessage;
      const amountValue = makeGnotAmountByRaw(amount);
      const amountStr = `${amountValue?.value} ${amountValue?.denom}`;
      infos.push(makeTransactionInfo('To', to_address, 'ADDRESS'));
      infos.push(makeTransactionInfo('Amount', amountStr));
      break;
    }
    case MsgEndpoint.MSG_CALL: {
      const { pkg_path, func } = firstMessage as RawVmCallMessage;
      infos.push(makeTransactionInfo('Path', pkg_path));
      infos.push(makeTransactionInfo('Function', func));
      break;
    }
    case MsgEndpoint.MSG_ADD_PKG: {
      const { package: pkg } = firstMessage as RawVmAddPackageMessage;
      infos.push(makeTransactionInfo('Path', pkg.path));
      infos.push(makeTransactionInfo('Name', pkg.name));
      break;
    }
    case MsgEndpoint.MSG_RUN: {
      const { package: pkg } = firstMessage as RawVmRunMessage;
      if (pkg) {
        infos.push(makeTransactionInfo('Path', pkg.path));
        infos.push(makeTransactionInfo('Name', pkg.name));
      }
      break;
    }
  }

  const networkFee = makeGnotAmountByRaw(transaction.fee.gas_fee);
  const networkFeeStr = `${networkFee?.value} ${networkFee?.denom}`;
  infos.push(makeTransactionInfo('Network Fee', networkFeeStr));

  return infos;
}

export interface UseBroadcastMultisigTransactionScreenReturn {
  broadcastTransactionState: BroadcastTransactionState;
  broadcast: () => Promise<boolean>;
  txHash: string | null;
  errorMessage: string | null;
  uploadMultisigTransaction: (text: string) => boolean;
  uploadSignature: (text: string) => SignatureUploadResult;
  transactionInfos: TransactionDisplayInfo[] | null;
  rawTransaction: string;
  signerPublicKeys: SignerPublicKeyInfo[];
  threshold: number;
}

const useBroadcastMultisigTransactionScreen = (): UseBroadcastMultisigTransactionScreenReturn => {
  const { wallet } = useWalletContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { multisigService } = useAdenaContext();

  const { transaction, setTransaction, signatures, addSignature } = useMultisigTransactionContext();

  const [broadcastTransactionState, setBroadcastTransactionState] = useState<
    BroadcastTransactionState
  >('IDLE');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    if (!transaction || transaction.msg.length === 0) {
      return null;
    }
    return mapMultisigTransactionInfo(transaction);
  }, [transaction]);

  const rawTransaction = useMemo(() => {
    if (!transaction) {
      return '';
    }
    return JSON.stringify(transaction, null, 2);
  }, [transaction]);

  const uploadMultisigTransaction = useCallback(
    (text: string): boolean => {
      if (!currentAddress) {
        return false;
      }

      try {
        const rawTx = JSON.parse(text) as RawTx;

        if (!rawTx.msg || !rawTx.fee || !rawTx.fee.gas_wanted || !rawTx.fee.gas_fee) {
          return false;
        }

        const validMessages = rawTx.msg.every((msg) => {
          const msgType = msg['@type'];
          if (!msgType) {
            return false;
          }
          return (
            msgType === MsgEndpoint.MSG_SEND ||
            msgType === MsgEndpoint.MSG_CALL ||
            msgType === MsgEndpoint.MSG_ADD_PKG ||
            msgType === MsgEndpoint.MSG_RUN
          );
        });

        if (!validMessages) {
          return false;
        }

        setTransaction(rawTx);
        return true;
      } catch (error) {
        console.error(error);
        setTransaction(null);
        return false;
      }
    },
    [currentAddress, setTransaction],
  );

  const uploadSignature = useCallback(
    (text: string): SignatureUploadResult => {
      try {
        const signature = JSON.parse(text) as Signature;

        if (
          !signature.pub_key ||
          !signature.pub_key.value ||
          !signature.signature ||
          signature.pub_key['@type'] !== '/tm.PubKeySecp256k1'
        ) {
          return { success: false, error: 'INVALID_FORMAT' };
        }

        const isValidSigner = signerPublicKeys.some(
          (signer) => signer.publicKey.value === signature.pub_key?.value,
        );

        if (!isValidSigner) {
          console.warn('Invalid signer: not in signerPublicKeys');
          return { success: false, error: 'INVALID_SIGNER' };
        }

        const isDuplicate = signatures.some((sig) => sig.pub_key.value === signature.pub_key.value);

        if (isDuplicate) {
          console.warn('Duplicate signature');
          return { success: false, error: 'DUPLICATE' };
        }

        addSignature(signature);
        return { success: true, error: null };
      } catch (error) {
        console.error(error);
        return { success: false, error: 'INVALID_FORMAT' };
      }
    },
    [signatures, addSignature, signerPublicKeys],
  );

  const broadcast = useCallback(async () => {
    if (!transaction || !signatures || !wallet || !currentAccount) {
      return false;
    }
    if (!isMultisigAccount(currentAccount)) {
      return false;
    }

    setBroadcastTransactionState('LOADING');
    setTxHash(null);
    setErrorMessage(null);
    try {
      const combinedTx = await multisigService.combineMultisigSignatures(
        currentAccount,
        transaction,
        signatures,
      );

      const broadcastResult = await multisigService.broadcastTxCommit(combinedTx.tx);

      const isSuccessBroadcasting =
        broadcastResult?.hash &&
        broadcastResult.check_tx?.ResponseBase?.Error === null &&
        broadcastResult.deliver_tx?.ResponseBase?.Error === null;

      if (isSuccessBroadcasting) {
        setTxHash(broadcastResult.hash);
        setBroadcastTransactionState('SUCCESS');
        return true;
      } else {
        const checkError = broadcastResult.check_tx?.ResponseBase?.Error;
        const deliverError = broadcastResult.deliver_tx?.ResponseBase?.Error;
        setErrorMessage(checkError?.message || deliverError?.message || 'Unknown error');
        setBroadcastTransactionState('FAILED');
        return false;
      }
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Unknown error');
      setBroadcastTransactionState('FAILED');
      return false;
    }
  }, [currentAccount, transaction, signatures, wallet, multisigService]);

  return {
    broadcastTransactionState,
    broadcast,
    txHash,
    errorMessage,
    uploadMultisigTransaction,
    uploadSignature,
    transactionInfos,
    rawTransaction,
    signerPublicKeys,
    threshold,
  };
};

export default useBroadcastMultisigTransactionScreen;
