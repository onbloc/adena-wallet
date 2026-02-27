import { MultisigTransactionProvider } from '@common/provider';
import { CommonFullContentLayout } from '@components/atoms';
import { useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import React from 'react';
import BroadcastTransactionLoading from '../broadcast-transaction-screen/loading';
import BroadcastTransactionResult from './result';
import BroadcastMultisigTransactionUpload from './upload';

const BroadcastMultisigTransactionContent: React.FC = () => {
  const { currentAddress } = useCurrentAccount();
  const {
    transaction,
    signatures,
    removeSignature,
    resetMultisigTransaction,
  } = useMultisigTransactionContext();

  const {
    broadcastTransactionState,
    broadcast,
    txHash,
    errorMessage,
    uploadMultisigTransaction,
    uploadSignature,
    transactionInfos,
    rawTransaction,
    signerPublicKeys,
    threshold,
  } = useBroadcastMultisigTransactionScreen();

  return (
    <CommonFullContentLayout>
      {broadcastTransactionState === 'IDLE' && (
        <BroadcastMultisigTransactionUpload
          currentAddress={currentAddress}
          transaction={transaction}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          uploadTransaction={uploadMultisigTransaction}
          signatures={signatures}
          uploadSignature={uploadSignature}
          removeSignature={removeSignature}
          broadcast={broadcast}
          reset={resetMultisigTransaction}
          signerPublicKeys={signerPublicKeys}
          threshold={threshold}
        />
      )}
      {broadcastTransactionState === 'LOADING' && <BroadcastTransactionLoading />}
      {broadcastTransactionState === 'SUCCESS' && (
        <BroadcastTransactionResult status='SUCCESS' txHash={txHash} errorMessage={errorMessage} />
      )}
      {broadcastTransactionState === 'FAILED' && (
        <BroadcastTransactionResult status='FAILED' txHash={txHash} errorMessage={errorMessage} />
      )}
    </CommonFullContentLayout>
  );
};

const BroadcastMultisigTransactionScreen: React.FC = () => {
  return (
    <MultisigTransactionProvider>
      <BroadcastMultisigTransactionContent />
    </MultisigTransactionProvider>
  );
};

export default BroadcastMultisigTransactionScreen;
