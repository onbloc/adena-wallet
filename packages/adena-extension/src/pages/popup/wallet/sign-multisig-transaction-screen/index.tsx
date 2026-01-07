import React from 'react';

import { useMultisigTransactionContext } from '@hooks/use-context';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import useSignMultisigTransactionScreen from '@hooks/wallet/sign-transaction/use-sign-multisig-transaction-screen';

import { CommonFullContentLayout } from '@components/atoms';
import SignMultisigTransactionUpload from './upload';

const SignMultisigTransactionScreen: React.FC = () => {
  const { multisigTransactionDocument, resetMultisigTransaction } = useMultisigTransactionContext();

  const { uploadMultisigTransaction, transactionInfos, rawTransaction } =
    useBroadcastMultisigTransactionScreen();

  const { signTransaction, signMultisigTransactionState } = useSignMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      <SignMultisigTransactionUpload
        multisigTransactionDocument={multisigTransactionDocument}
        transactionInfos={transactionInfos || []}
        rawTransaction={rawTransaction}
        uploadTransaction={uploadMultisigTransaction}
        signTransaction={signTransaction}
        signTransactionState={signMultisigTransactionState}
        reset={resetMultisigTransaction}
      />
    </CommonFullContentLayout>
  );
};

export default SignMultisigTransactionScreen;
