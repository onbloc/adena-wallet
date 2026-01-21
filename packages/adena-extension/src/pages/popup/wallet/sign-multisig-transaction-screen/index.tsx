import { MultisigTransactionProvider } from '@common/provider';
import { CommonFullContentLayout } from '@components/atoms';
import { useMultisigTransactionContext } from '@hooks/use-context';
import { useCurrentAccount } from '@hooks/use-current-account';
import useBroadcastMultisigTransactionScreen from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import useSignMultisigTransactionScreen from '@hooks/wallet/sign-transaction/use-sign-multisig-transaction-screen';
import {
  RawBankSendMessage,
  RawVmAddPackageMessage,
  RawVmCallMessage,
  RawVmRunMessage,
} from 'adena-module';
import React, { useEffect } from 'react';
import SignTransactionLoading from './loading';
import SignTransactionResult from './result';
import SignMultisigTransactionUpload from './upload';

const SignMultisigTransactionContent: React.FC = () => {
  const { currentAddress } = useCurrentAccount();

  const {
    transaction,
    chainId,
    accountNumber,
    sequence,
    updateAccountInfo,
    setAccountNumber,
    setSequence,
    resetMultisigTransaction,
  } = useMultisigTransactionContext();

  const {
    uploadMultisigTransaction,
    transactionInfos,
    rawTransaction,
  } = useBroadcastMultisigTransactionScreen();

  const {
    signTransaction,
    signTransactionState,
    errorMessage,
  } = useSignMultisigTransactionScreen();

  useEffect(() => {
    if (!chainId || !transaction) {
      return;
    }

    if (transaction.msg.length === 0) {
      return;
    }

    let caller = '';

    const firstMessageType = transaction.msg[0]['@type'];
    switch (firstMessageType) {
      case '/vm.m_call': {
        const vmCallMessage = transaction.msg[0] as RawVmCallMessage;
        caller = vmCallMessage.caller;
        break;
      }
      case '/vm.m_addpkg': {
        const vmAddPkgMessage = transaction.msg[0] as RawVmAddPackageMessage;
        caller = vmAddPkgMessage.creator;
        break;
      }
      case '/bank.MsgSend': {
        const bankSendMessage = transaction.msg[0] as RawBankSendMessage;
        caller = bankSendMessage.from_address;
        break;
      }
      case '/vm.m_run': {
        const vmRunMessage = transaction.msg[0] as RawVmRunMessage;
        caller = vmRunMessage.caller;
        break;
      }
      default:
        return;
    }

    if (!caller) {
      return;
    }

    updateAccountInfo(caller);
  }, [transaction, chainId, updateAccountInfo]);

  return (
    <CommonFullContentLayout>
      {signTransactionState === 'IDLE' && (
        <SignMultisigTransactionUpload
          currentAddress={currentAddress}
          transaction={transaction}
          chainId={chainId}
          accountNumber={accountNumber}
          sequence={sequence}
          transactionInfos={transactionInfos || []}
          rawTransaction={rawTransaction}
          uploadTransaction={uploadMultisigTransaction}
          setAccountNumber={setAccountNumber}
          setSequence={setSequence}
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
