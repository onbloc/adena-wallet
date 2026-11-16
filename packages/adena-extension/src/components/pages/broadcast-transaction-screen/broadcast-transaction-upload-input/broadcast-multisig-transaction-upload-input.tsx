import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { useAdenaContext } from '@hooks/use-context';

import IconFile from '@assets/file.svg';
import IconUpload from '@assets/icon-upload';
import { ErrorText, Text, WebImg } from '@components/atoms';
import { RawTx } from 'adena-module';
import {
  StyledHiddenInput,
  StyledInputLabel,
  StyledWrapper,
} from './broadcast-transaction-upload-input.styles';

export interface BroadcastMultisigTransactionUploadInputProps {
  currentAddress: string | null;
  transaction: RawTx | null;
  uploadTransaction: (text: string) => boolean;
  validatePublicKey?: boolean;
}

const BroadcastMultisigTransactionUploadInput: React.FC<BroadcastMultisigTransactionUploadInputProps> = ({
  currentAddress,
  transaction,
  uploadTransaction,
  validatePublicKey = true,
}) => {
  const theme = useTheme();
  const { multisigService } = useAdenaContext();

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const hasError = useMemo(() => {
    return errorMessage !== null;
  }, [errorMessage]);

  const uploadState = useMemo(() => {
    if (transaction) {
      return 'SUCCESS';
    }
    if (loading) {
      return 'LOADING';
    }
    return 'NONE';
  }, [transaction, loading]);

  const onDropFile = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        uploadFile(file);
      }
    },
    [uploadTransaction],
  );

  const onChangeFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        uploadFile(file);
      }
    },
    [uploadTransaction],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setErrorMessage(null);

      try {
        if (!currentAddress) {
          throw new Error('Current address not found');
        }

        if (validatePublicKey) {
          await multisigService.validatePublicKeyExists(currentAddress);
        }

        const text = await file.text();
        const isUploadSuccess = uploadTransaction(text);

        if (!isUploadSuccess) {
          throw new Error('Invalid transaction format');
        }

        setErrorMessage(null);
        setFileName(file.name);
      } catch (error) {
        console.error('Upload failed:', error);

        if (error instanceof Error) {
          if (error.message.includes('Public key not found')) {
            setErrorMessage('Your account has not been initialized.');
          } else if (error.message.includes('not sent any transactions')) {
            setErrorMessage('Your account has not been initialized.');
          } else {
            setErrorMessage(error.message);
          }
        } else {
          setErrorMessage('Upload failed. Please try again.');
        }

        setFileName(null);
      } finally {
        setLoading(false);
      }
    },
    [currentAddress, multisigService, uploadTransaction],
  );

  return (
    <StyledWrapper>
      <StyledInputLabel htmlFor='fileUpload' onDrop={onDropFile}>
        {uploadState === 'NONE' && (
          <React.Fragment>
            <IconUpload fill='inherit' />
            <Text type='body2Reg' color='inherit'>
              {'Drag & drop a file or click to upload'}
            </Text>
          </React.Fragment>
        )}
        {uploadState === 'LOADING' && (
          <React.Fragment>
            <IconUpload fill='inherit' />
            <Text type='body2Reg' color={theme.neutral.a}>
              {'Uploading file...'}
            </Text>
          </React.Fragment>
        )}
        {uploadState === 'SUCCESS' && (
          <React.Fragment>
            <WebImg src={IconFile} size={32} />
            <Text type='body2Reg' color={theme.neutral._1}>
              {fileName}
            </Text>
          </React.Fragment>
        )}
      </StyledInputLabel>
      {hasError && <ErrorText text={errorMessage || ''} />}

      <StyledHiddenInput
        id='fileUpload'
        type='file'
        accept='.txt,.tx'
        onChange={onChangeFileInput}
      />
    </StyledWrapper>
  );
};

export default BroadcastMultisigTransactionUploadInput;
