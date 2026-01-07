import { useState, useCallback } from 'react';
import { useAdenaContext, useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

export type SignTransactionState = 'IDLE' | 'SIGNING' | 'SUCCESS' | 'FAILED';

export interface UseSignMultisigTransactionScreenReturn {
  signTransactionState: SignTransactionState;
  signTransaction: () => Promise<boolean>;
  resetSignState: () => void;
}

const useSignMultisigTransactionScreen = (): UseSignMultisigTransactionScreenReturn => {
  const [signTransactionState, setSignTransactionState] = useState<SignTransactionState>('IDLE');

  const { multisigService } = useAdenaContext();
  const { currentAccount } = useCurrentAccount();
  const { multisigTransactionDocument, addSignature } = useMultisigTransactionContext();

  const signTransaction = useCallback(async (): Promise<boolean> => {
    if (!multisigTransactionDocument || !currentAccount) {
      return false;
    }

    try {
      setSignTransactionState('SIGNING');

      const newSignature = await multisigService.signMultisigTransaction(
        currentAccount,
        multisigTransactionDocument,
      );

      const fileSaved = await multisigService.saveSignatureToFile(newSignature);

      if (!fileSaved) {
        setSignTransactionState('IDLE');
        return false;
      }

      addSignature(newSignature);
      setSignTransactionState('SUCCESS');
      return true;
    } catch (e) {
      console.error('Sign failed:', e);
      setSignTransactionState('FAILED');
      return false;
    }
  }, [currentAccount, multisigTransactionDocument, multisigService, addSignature]);

  const resetSignState = useCallback(() => {
    setSignTransactionState('IDLE');
  }, []);

  return {
    signTransactionState,
    signTransaction,
    resetSignState,
  };
};

export default useSignMultisigTransactionScreen;
