import React from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import BroadcastMultisigTransactionUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-input/broadcast-multisig-transaction-upload-input';
import BroadcastTransactionUploadResult from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-result/broadcast-transaction-upload-result';
import { RawTx } from 'adena-module';

interface SignMultisigTransactionUploadProps {
  currentAddress: string | null;
  transaction: RawTx | null;
  chainId: string;
  accountNumber: string;
  sequence: string;
  transactionInfos: TransactionDisplayInfo[];
  uploadTransaction: (text: string) => boolean;
  rawTransaction: string;
  setAccountNumber: (accountNumber: string) => void;
  setSequence: (sequence: string) => void;
  signTransaction: () => Promise<boolean>;
  reset: () => void;
}

const SignMultisigTransactionUpload: React.FC<SignMultisigTransactionUploadProps> = ({
  currentAddress,
  transaction,
  chainId,
  accountNumber,
  sequence,
  setAccountNumber,
  setSequence,
  transactionInfos,
  uploadTransaction,
  rawTransaction,
  signTransaction,
  reset,
}) => {
  const theme = useTheme();
  const [isSigning, setIsSigning] = React.useState(false);
  const { goBack } = useAppNavigate();

  const loadedTransaction = React.useMemo(() => {
    return Boolean(transaction);
  }, [transaction]);

  const blockEvent = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onClickSign = (): void => {
    if (isSigning) {
      return;
    }
    setIsSigning(true);
    signTransaction().finally(() => {
      setIsSigning(false);
      reset();
    });
  };

  const onClickCancel = React.useCallback((): void => {
    goBack();
    reset();
  }, [goBack, reset]);

  React.useEffect(() => {
    window.addEventListener('drop', blockEvent, false);
    window.addEventListener('dragover', blockEvent, false);
    return () => {
      window.removeEventListener('drop', blockEvent);
      window.removeEventListener('dragover', blockEvent);
    };
  }, []);

  return (
    <CommonFullContentLayout>
      <StyledWrapper>
        <StyledHeaderWrapper>
          <Text type='header4' textAlign='center'>
            {'Sign Transaction'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'Upload an unsigned transaction file to Adena to sign it.'}
          </Text>
        </StyledHeaderWrapper>

        <StyledInputWrapper>
          <BroadcastMultisigTransactionUploadInput
            currentAddress={currentAddress}
            transaction={transaction}
            uploadTransaction={uploadTransaction}
            validatePublicKey={true}
          />

          {loadedTransaction && (
            <BroadcastTransactionUploadResult
              signInfo={{
                chainId,
                accountNumber,
                sequence,
                setAccountNumber,
                setSequence,
              }}
              rawTransaction={rawTransaction}
              transactionInfos={transactionInfos}
            />
          )}
        </StyledInputWrapper>
      </StyledWrapper>

      <BottomFixedButtonGroup
        filled
        leftButton={{
          text: 'Cancel',
          onClick: onClickCancel,
        }}
        rightButton={{
          primary: true,
          disabled: !loadedTransaction,
          text: 'Sign',
          onClick: onClickSign,
        }}
      />
    </CommonFullContentLayout>
  );
};

export default SignMultisigTransactionUpload;

const StyledWrapper = styled(View)`
  width: 100%;
  gap: 24px;
  padding: 24px 20px 120px;
`;

const StyledHeaderWrapper = styled(View)`
  gap: 12px;
  justify-content: center;
  align-items: center;
`;

const StyledInputWrapper = styled(View)`
  gap: 12px;
`;
