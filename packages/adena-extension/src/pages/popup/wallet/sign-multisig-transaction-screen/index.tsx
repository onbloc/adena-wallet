import React from 'react';

import { useMultisigTransactionContext } from '@hooks/use-context';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import useSignMultisigTransactionScreen from '@hooks/wallet/sign-transaction/use-sign-multisig-transaction-screen';

import { CommonFullContentLayout } from '@components/atoms';
import SignMultisigTransactionUpload from './upload';
import SignTransactionLoading from './loading';
import SignTransactionResult from './result';

const SignMultisigTransactionScreen: React.FC = () => {
  const { multisigTransactionDocument, resetMultisigTransaction } = useMultisigTransactionContext();

  const { uploadMultisigTransaction, transactionInfos, rawTransaction } =
    useBroadcastMultisigTransactionScreen();

  const { signTransaction, signTransactionState, errorMessage } =
    useSignMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      {signTransactionState === 'IDLE' && (
        <SignMultisigTransactionUpload
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

export default SignMultisigTransactionScreen;
