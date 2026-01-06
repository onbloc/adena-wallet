import React from 'react';

import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';

import { CommonFullContentLayout } from '@components/atoms';
import BroadcastMultisigTransactionUpload from './upload';
import BroadcastTransactionLoading from '../broadcast-transaction-screen/loading';
import BroadcastTransactionFailed from '../broadcast-transaction-screen/failed';

const BroadcastMultisigTransactionScreen: React.FC = () => {
  const {
    multisigTransactionDocument,
    uploadMultisigTransaction,
    transactionInfos,
    rawTransaction,
    broadcastTransactionState,
    signatures,
    uploadSignature,
    removeSignature,
  } = useBroadcastMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      {broadcastTransactionState === 'UPLOAD_TRANSACTION' && (
        <BroadcastMultisigTransactionUpload
          multisigTransactionDocument={multisigTransactionDocument}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          uploadTransaction={uploadMultisigTransaction}
          signatures={signatures}
          uploadSignature={uploadSignature}
          removeSignature={removeSignature}
        />
      )}
      {broadcastTransactionState === 'LOADING' && <BroadcastTransactionLoading />}
      {broadcastTransactionState === 'FAILED' && <BroadcastTransactionFailed />}
    </CommonFullContentLayout>
  );
};

export default BroadcastMultisigTransactionScreen;
