import React from 'react';
import { MultisigTransactionProvider } from '@common/provider';
import { useMultisigTransactionContext } from '@hooks/use-context';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import useSignMultisigTransactionScreen from '@hooks/wallet/sign-transaction/use-sign-multisig-transaction-screen';
import { useCurrentAccount } from '@hooks/use-current-account';
import { CommonFullContentLayout } from '@components/atoms';
import SignMultisigTransactionUpload from './upload';
import SignTransactionLoading from './loading';
import SignTransactionResult from './result';

const SignMultisigTransactionContent: React.FC = () => {
  const { currentAddress } = useCurrentAccount();

  const { multisigTransactionDocument, resetMultisigTransaction } = useMultisigTransactionContext();

  const { uploadMultisigTransaction, transactionInfos, rawTransaction } =
    useBroadcastMultisigTransactionScreen();

  const { signTransaction, signTransactionState, errorMessage } =
    useSignMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      {signTransactionState === 'IDLE' && (
        <SignMultisigTransactionUpload
          currentAddress={currentAddress}
          multisigTransactionDocument={multisigTransactionDocument}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          uploadTransaction={uploadMultisigTransaction}
          signTransaction={signTransaction}
          reset={resetMultisigTransaction}
        />
      )}
      {signTransactionState === 'SIGNING' && <SignTransactionLoading />}
      {signTransactionState === 'SUCCESS' && <SignTransactionResult status='SUCCESS' />}
      {signTransactionState === 'FAILED' && (
        <SignTransactionResult status='FAILED' errorMessage={errorMessage} />
      )}
    </CommonFullContentLayout>
  );
};

const SignMultisigTransactionScreen: React.FC = () => {
  return (
    <MultisigTransactionProvider>
      <SignMultisigTransactionContent />
    </MultisigTransactionProvider>
  );
};

export default SignMultisigTransactionScreen;
