import React from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { MultisigTransactionDocument } from '@inject/types';
import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import BroadcastTransactionUploadResult from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-result/broadcast-transaction-upload-result';
import BroadcastMultisigTransactionUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-input/broadcast-multisig-transaction-upload-input';

interface SignMultisigTransactionUploadProps {
  multisigTransactionDocument: MultisigTransactionDocument | null;
  transactionInfos: TransactionDisplayInfo[];
  uploadTransaction: (text: string) => boolean;
  rawTransaction: string;
  signTransaction: () => Promise<boolean>;
  reset: () => void;
}

const SignMultisigTransactionUpload: React.FC<SignMultisigTransactionUploadProps> = ({
  multisigTransactionDocument,
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
    return Boolean(multisigTransactionDocument);
  }, [multisigTransactionDocument]);

  const blockEvent = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const onClickSign = () => {
    if (isSigning) {
      return;
    }
    setIsSigning(true);
    signTransaction().finally(() => {
      setIsSigning(false);
      reset();
    });
  };

  const onClickCancel = React.useCallback(() => {
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
            {'Upload a signed transaction file to\nAdena to broadcast it.'}
          </Text>
        </StyledHeaderWrapper>

        <StyledInputWrapper>
          <BroadcastMultisigTransactionUploadInput
            multisigTransactionDocument={multisigTransactionDocument}
            uploadMultisigTransaction={uploadTransaction}
          />

          {loadedTransaction && (
            <BroadcastTransactionUploadResult
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
