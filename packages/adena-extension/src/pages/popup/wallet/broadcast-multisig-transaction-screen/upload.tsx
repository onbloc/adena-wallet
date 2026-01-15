import React from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { MultisigTransactionDocument, Signature } from '@inject/types';
import {
  TransactionDisplayInfo,
  SignatureUploadResult,
} from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import { SignerPublicKeyInfo } from 'adena-module';

import { CommonFullContentLayout, Text, View } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import BroadcastTransactionUploadResult from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-result/broadcast-transaction-upload-result';
import BroadcastMultisigTransactionUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-input/broadcast-multisig-transaction-upload-input';
import BroadcastMultisigSignatureUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-multisig-signature-upload-input/broadcast-multisig-signature-upload-input';

interface BroadcastMultisigTransactionUploadProps {
  currentAddress: string | null;
  multisigTransactionDocument: MultisigTransactionDocument | null;
  transactionInfos: TransactionDisplayInfo[];
  uploadTransaction: (text: string) => boolean;
  rawTransaction: string;
  signatures: Signature[];
  uploadSignature: (text: string) => SignatureUploadResult;
  removeSignature: (pubKeyValue: string) => void;
  broadcast: () => Promise<boolean>;
  reset: () => void;
  signerPublicKeys: SignerPublicKeyInfo[];
  threshold: number;
}

const BroadcastMultisigTransactionUpload: React.FC<BroadcastMultisigTransactionUploadProps> = ({
  currentAddress,
  multisigTransactionDocument,
  transactionInfos,
  uploadTransaction,
  rawTransaction,
  signatures,
  uploadSignature,
  removeSignature,
  broadcast,
  reset,
  signerPublicKeys,
  threshold,
}) => {
  const theme = useTheme();
  const [isBroadcasting, setIsBroadcasting] = React.useState(false);
  const { goBack } = useAppNavigate();

  const validSignatures = React.useMemo(() => {
    return signatures.filter((signature) =>
      signerPublicKeys.some((signer) => signer.publicKey.value === signature.pub_key.value),
    );
  }, [signatures, signerPublicKeys]);

  const loadedTransaction = React.useMemo(() => {
    return Boolean(multisigTransactionDocument);
  }, [multisigTransactionDocument]);

  const blockEvent = (event: DragEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };

  const disableBroadcast = React.useMemo(() => {
    if (isBroadcasting) {
      return true;
    }
    return validSignatures.length < threshold;
  }, [isBroadcasting, validSignatures, threshold]);

  const onClickBroadcast = (): void => {
    if (disableBroadcast) {
      return;
    }
    setIsBroadcasting(true);
    broadcast().finally(() => {
      setIsBroadcasting(false);
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
            {'Broadcast Transaction'}
          </Text>
          <Text type='body1Reg' color={theme.neutral.a} textAlign='center'>
            {'Upload a signed transaction file to\nAdena to broadcast it.'}
          </Text>
        </StyledHeaderWrapper>

        <StyledInputWrapper>
          <BroadcastMultisigTransactionUploadInput
            currentAddress={currentAddress}
            multisigTransactionDocument={multisigTransactionDocument}
            uploadTransaction={uploadTransaction}
          />

          {loadedTransaction && (
            <BroadcastMultisigSignatureUploadInput
              signatures={signatures}
              uploadSignature={uploadSignature}
              removeSignature={removeSignature}
              signerPublicKeys={signerPublicKeys}
              threshold={threshold}
            />
          )}

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
          disabled: !loadedTransaction || disableBroadcast,
          text: 'Broadcast',
          onClick: onClickBroadcast,
        }}
      />
    </CommonFullContentLayout>
  );
};

export default BroadcastMultisigTransactionUpload;

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
