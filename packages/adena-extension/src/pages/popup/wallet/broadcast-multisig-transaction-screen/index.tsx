import React from 'react';

import { useMultisigTransactionContext } from '@hooks/use-context';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';

import { CommonFullContentLayout } from '@components/atoms';
import BroadcastMultisigTransactionUpload from './upload';
import BroadcastTransactionLoading from '../broadcast-transaction-screen/loading';
import BroadcastTransactionResult from './result';

const BroadcastMultisigTransactionScreen: React.FC = () => {
  const { multisigTransactionDocument, signatures, removeSignature, resetMultisigTransaction } =
    useMultisigTransactionContext();

  const {
    broadcastTransactionState,
    broadcast,
    uploadMultisigTransaction,
    uploadSignature,
    transactionInfos,
    rawTransaction,
  } = useBroadcastMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      {broadcastTransactionState === 'IDLE' && (
        <BroadcastMultisigTransactionUpload
          multisigTransactionDocument={multisigTransactionDocument}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          uploadTransaction={uploadMultisigTransaction}
          signatures={signatures}
          uploadSignature={uploadSignature}
          removeSignature={removeSignature}
          broadcast={broadcast}
          reset={resetMultisigTransaction}
        />
      )}
      {broadcastTransactionState === 'LOADING' && <BroadcastTransactionLoading />}
      {broadcastTransactionState === 'SUCCESS' && <BroadcastTransactionResult status='SUCCESS' />}
      {broadcastTransactionState === 'FAILED' && <BroadcastTransactionResult status='FAILED' />}
    </CommonFullContentLayout>
  );
};

export default BroadcastMultisigTransactionScreen;
