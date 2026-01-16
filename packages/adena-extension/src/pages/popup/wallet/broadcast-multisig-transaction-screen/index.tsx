import React from 'react';
import { MultisigTransactionProvider } from '@common/provider';
import { useMultisigTransactionContext } from '@hooks/use-context';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import { useCurrentAccount } from '@hooks/use-current-account';
import { CommonFullContentLayout } from '@components/atoms';
import BroadcastMultisigTransactionUpload from './upload';
import BroadcastTransactionLoading from '../broadcast-transaction-screen/loading';
import BroadcastTransactionResult from './result';

const BroadcastMultisigTransactionContent: React.FC = () => {
  const { currentAddress } = useCurrentAccount();
  const { multisigTransactionDocument, signatures, removeSignature, resetMultisigTransaction } =
    useMultisigTransactionContext();

  const {
    broadcastTransactionState,
    broadcast,
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
          multisigTransactionDocument={multisigTransactionDocument}
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
      {broadcastTransactionState === 'SUCCESS' && <BroadcastTransactionResult status='SUCCESS' />}
      {broadcastTransactionState === 'FAILED' && <BroadcastTransactionResult status='FAILED' />}
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
