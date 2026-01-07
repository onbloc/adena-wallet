import { useState, useCallback } from 'react';
import { useAdenaContext, useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

export type SignMultisigTransactionState = 'IDLE' | 'SIGNING' | 'SUCCESS' | 'FAILED';

export interface UseSignMultisigTransactionScreenReturn {
  signMultisigTransactionState: SignMultisigTransactionState;
  signTransaction: () => Promise<boolean>;
  resetSignState: () => void;
}

const useSignMultisigTransactionScreen = (): UseSignMultisigTransactionScreenReturn => {
  const [signMultisigTransactionState, setSignMultisigTransactionState] =
    useState<SignMultisigTransactionState>('IDLE');

  const { multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { multisigTransactionDocument, addSignature } = useMultisigTransactionContext();

  const signTransaction = useCallback(async (): Promise<boolean> => {
    if (!multisigTransactionDocument || !currentAccount) {
      return false;
    }

    try {
      setSignMultisigTransactionState('SIGNING');

      const newSignature = await multisigService.signMultisigTransaction(
        currentAccount,
        multisigTransactionDocument,
      );

      const fileSaved = await multisigService.saveSignatureToFile(newSignature);

      if (!fileSaved) {
        setSignMultisigTransactionState('IDLE');
        return false;
      }

      addSignature(newSignature);
      setSignMultisigTransactionState('SUCCESS');
      return true;
    } catch (e) {
      console.error('Sign failed:', e);
      setSignMultisigTransactionState('FAILED');
      return false;
    }
  }, [currentAccount, multisigTransactionDocument, multisigService, addSignature]);

  const resetSignState = useCallback(() => {
    setSignMultisigTransactionState('IDLE');
  }, []);

  return {
    signMultisigTransactionState,
    signTransaction,
    resetSignState,
  };
};

export default useSignMultisigTransactionScreen;
