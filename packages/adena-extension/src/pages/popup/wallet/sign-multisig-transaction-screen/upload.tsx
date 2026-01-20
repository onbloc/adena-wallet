import React from 'react';
import styled, { useTheme } from 'styled-components';

import useAppNavigate from '@hooks/use-app-navigate';
import { MultisigTransactionDocument } from '@inject/types';
import { TransactionDisplayInfo } from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';
import useLink from '@hooks/use-link';

import { CommonFullContentLayout, Pressable, Text, View } from '@components/atoms';
import { BottomFixedButtonGroup } from '@components/molecules';
import BroadcastTransactionUploadResult from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-result/broadcast-transaction-upload-result';
import BroadcastMultisigTransactionUploadInput from '@components/pages/broadcast-transaction-screen/broadcast-transaction-upload-input/broadcast-multisig-transaction-upload-input';
import IconHelp from '@assets/help.svg';

interface SignMultisigTransactionUploadProps {
  currentAddress: string | null;
  multisigTransactionDocument: MultisigTransactionDocument | null;
  transactionInfos: TransactionDisplayInfo[];
  uploadTransaction: (text: string) => boolean;
  rawTransaction: string;
  signTransaction: () => Promise<boolean>;
  reset: () => void;
}

const SignMultisigTransactionUpload: React.FC<SignMultisigTransactionUploadProps> = ({
  currentAddress,
  multisigTransactionDocument,
  transactionInfos,
  uploadTransaction,
  rawTransaction,
  signTransaction,
  reset,
}) => {
  const theme = useTheme();
  const { openLink } = useLink();
  const [isSigning, setIsSigning] = React.useState(false);
  const { goBack } = useAppNavigate();

  const loadedTransaction = React.useMemo(() => {
    return Boolean(multisigTransactionDocument);
  }, [multisigTransactionDocument]);

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

  const onClickHelp = React.useCallback(() => {
    openLink('');
  }, []);

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
            multisigTransactionDocument={multisigTransactionDocument}
            uploadTransaction={uploadTransaction}
            validatePublicKey={true}
          />

          {loadedTransaction && (
            <BroadcastTransactionUploadResult
              rawTransaction={rawTransaction}
              transactionInfos={transactionInfos}
            />
          )}
        </StyledInputWrapper>

        {!loadedTransaction && (
          <StyledHelpWrapper onClick={onClickHelp}>
            <Text type='body1Reg' color={theme.neutral.a}>
              {'How does it work'}
            </Text>
            <img src={IconHelp} alt='help icon' />
          </StyledHelpWrapper>
        )}
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

const StyledHelpWrapper = styled(Pressable)`
  flex-direction: row;
  gap: 6px;
  justify-content: center;
  align-items: center;
`;
