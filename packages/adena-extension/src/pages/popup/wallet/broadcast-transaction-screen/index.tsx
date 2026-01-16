import React from 'react';

import { CommonFullContentLayout } from '@components/atoms';
import useBroadcastTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-transaction-screen';
import BroadcastTransactionUpload from './upload';
import BroadcastTransactionLoading from './loading';
import BroadcastTransactionFailed from './failed';

const BroadcastTransactionScreen: React.FC = () => {
  const {
    transaction,
    transactionInfos,
    broadcastTransactionState,
    rawTransaction,
    broadcast,
    uploadTransaction,
  } = useBroadcastTransactionScreen();

  return (
    <CommonFullContentLayout>
      {broadcastTransactionState === 'UPLOAD_TRANSACTION' && (
        <BroadcastTransactionUpload
          transaction={transaction}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          broadcast={broadcast}
          uploadTransaction={uploadTransaction}
        />
      )}
      {broadcastTransactionState === 'LOADING' && <BroadcastTransactionLoading />}
      {broadcastTransactionState === 'FAILED' && <BroadcastTransactionFailed />}
    </CommonFullContentLayout>
  );
};

export default BroadcastTransactionScreen;
