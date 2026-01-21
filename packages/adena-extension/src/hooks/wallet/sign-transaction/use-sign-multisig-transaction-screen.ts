import { useAdenaContext, useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import { useCallback, useState } from 'react';

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
  const {
    transaction,
    chainId,
    accountNumber,
    sequence,
    addSignature,
  } = useMultisigTransactionContext();

  const signTransaction = useCallback(async (): Promise<boolean> => {
    if (!transaction || !currentAccount || !currentAddress) {
      return false;
    }

    try {
      setSignTransactionState('SIGNING');

      const newSignature = await multisigService.signMultisigTransaction(
        currentAccount,
        currentAddress,
        chainId,
        transaction,
        accountNumber,
        sequence,
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
  }, [
    currentAccount,
    currentAddress,
    chainId,
    transaction,
    accountNumber,
    sequence,
    multisigService,
    addSignature,
  ]);

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
