import { useState, useCallback } from 'react';
import { useAdenaContext, useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';

export type SignTransactionState = 'IDLE' | 'SIGNING' | 'SUCCESS' | 'FAILED';

export interface UseSignMultisigTransactionScreenReturn {
  signTransactionState: SignTransactionState;
  errorMessage: string | null;
  signTransaction: () => Promise<boolean>;
  resetSignState: () => void;
}

const useSignMultisigTransactionScreen = (): UseSignMultisigTransactionScreenReturn => {
  const [signTransactionState, setSignTransactionState] = useState<SignTransactionState>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { multisigService } = useAdenaContext();
  const { currentAccount, currentAddress } = useCurrentAccount();
  const { multisigTransactionDocument, addSignature } = useMultisigTransactionContext();

  const signTransaction = useCallback(async (): Promise<boolean> => {
    if (!multisigTransactionDocument || !currentAccount || !currentAddress) {
      return false;
    }

    try {
      setSignTransactionState('SIGNING');

      const newSignature = await multisigService.signMultisigTransaction(
        currentAccount,
        currentAddress,
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
      if (e instanceof Error && e.message.includes('Public key not found')) {
        setErrorMessage(e.message);
      }
      setSignTransactionState('FAILED');
      return false;
    }
  }, [currentAccount, currentAddress, multisigTransactionDocument, multisigService, addSignature]);

  const resetSignState = useCallback(() => {
    setSignTransactionState('IDLE');
    setErrorMessage(null);
  }, []);

  return {
    signTransactionState,
    errorMessage,
    signTransaction,
    resetSignState,
  };
};

export default useSignMultisigTransactionScreen;
