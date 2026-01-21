import React from 'react';

import { useAdenaContext } from '@hooks/use-context';
import { useNetwork } from '@hooks/use-network';
import { Signature } from '@inject/types';
import { RawTx } from 'adena-module';

export interface MultisigTransactionContextProps {
  transaction: RawTx | null;
  chainId: string;
  accountNumber: string;
  sequence: string;
  signatures: Signature[];
  updateAccountInfo: (caller: string) => Promise<void>;
  setAccountNumber: (accountNumber: string) => void;
  setSequence: (sequence: string) => void;
  setTransaction: (tx: RawTx | null) => void;
  addSignature: (signature: Signature) => void;
  removeSignature: (pubKeyValue: string) => void;
  clearSignatures: () => void;
  resetMultisigTransaction: () => void;
}

export const MultisigTransactionContext = React.createContext<MultisigTransactionContextProps | null>(
  null,
);

export const MultisigTransactionProvider: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
}) => {
  const { currentNetwork } = useNetwork();
  const { accountService } = useAdenaContext();

  const [transaction, setTransaction] = React.useState<RawTx | null>(null);
  const [signatures, setSignatures] = React.useState<Signature[]>([]);
  const [accountNumber, setAccountNumber] = React.useState<string>('0');
  const [sequence, setSequence] = React.useState<string>('0');

  const addSignature = React.useCallback((signature: Signature) => {
    setSignatures((prev) => {
      const isDuplicate = prev.some((sig) => sig.pub_key.value === signature.pub_key.value);
      if (isDuplicate) {
        return prev;
      }
      return [...prev, signature];
    });
  }, []);

  const removeSignature = React.useCallback((pubKeyValue: string) => {
    setSignatures((prev) => prev.filter((sig) => sig.pub_key.value !== pubKeyValue));
  }, []);

  const clearSignatures = React.useCallback(() => {
    setAccountNumber('0');
    setSequence('0');
    setSignatures([]);
  }, []);

  const updateAccountInfo = React.useCallback(
    async (caller: string) => {
      if (!accountService) {
        return;
      }

      const accountInfo = await accountService.getAccountInfo(caller);
      if (accountInfo) {
        setAccountNumber(accountInfo.accountNumber);
        setSequence(accountInfo.sequence);
      }
    },
    [accountService],
  );

  const resetMultisigTransaction = React.useCallback(() => {
    setTransaction(null);
    setSignatures([]);
  }, []);

  return (
    <MultisigTransactionContext.Provider
      value={{
        transaction,
        chainId: currentNetwork?.chainId ?? '',
        accountNumber,
        sequence,
        signatures,
        updateAccountInfo,
        setAccountNumber,
        setSequence,
        setTransaction,
        addSignature,
        removeSignature,
        clearSignatures,
        resetMultisigTransaction,
      }}
    >
      {children}
    </MultisigTransactionContext.Provider>
  );
};
