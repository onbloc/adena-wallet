import React from 'react';

import { MultisigTransactionDocument, Signature } from '@inject/types';

export interface MultisigTransactionContextProps {
  multisigTransactionDocument: MultisigTransactionDocument | null;
  setMultisigTransactionDocument: (doc: MultisigTransactionDocument | null) => void;
  signatures: Signature[];
  addSignature: (signature: Signature) => void;
  removeSignature: (pubKeyValue: string) => void;
  clearSignatures: () => void;
  resetMultisigTransaction: () => void;
}

export const MultisigTransactionContext =
  React.createContext<MultisigTransactionContextProps | null>(null);

export const MultisigTransactionProvider: React.FC<React.PropsWithChildren<unknown>> = ({
  children,
}) => {
  const [multisigTransactionDocument, setMultisigTransactionDocument] =
    React.useState<MultisigTransactionDocument | null>(null);
  const [signatures, setSignatures] = React.useState<Signature[]>([]);

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
    setSignatures([]);
  }, []);

  const resetMultisigTransaction = React.useCallback(() => {
    setMultisigTransactionDocument(null);
    setSignatures([]);
  }, []);

  return (
    <MultisigTransactionContext.Provider
      value={{
        multisigTransactionDocument,
        setMultisigTransactionDocument,
        signatures,
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
