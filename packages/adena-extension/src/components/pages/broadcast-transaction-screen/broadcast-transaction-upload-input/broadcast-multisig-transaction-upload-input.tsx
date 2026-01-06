import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { ErrorText, Text, WebImg } from '@components/atoms';
import {
  StyledHiddenInput,
  StyledInputLabel,
  StyledWrapper,
} from './broadcast-transaction-upload-input.styles';
import IconFile from '@assets/file.svg';
import { MultisigTransactionDocument } from '@inject/types';
import IconUpload from '@assets/icon-upload';

export interface BroadcastMultisigTransactionUploadInputProps {
  multisigTransactionDocument: MultisigTransactionDocument | null;
  uploadMultisigTransaction: (text: string) => boolean;
}

const BroadcastMultisigTransactionUploadInput: React.FC<
  BroadcastMultisigTransactionUploadInputProps
> = ({ multisigTransactionDocument, uploadMultisigTransaction }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const hasError = useMemo(() => {
    return errorMessage !== null;
  }, [errorMessage]);

  const uploadState = useMemo(() => {
    if (multisigTransactionDocument) {
      return 'SUCCESS';
    }
    if (loading) {
      return 'LOADING';
    }
    return 'NONE';
  }, [multisigTransactionDocument, loading]);

  const onDropFile = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length > 0) {
        const file = event.dataTransfer.files[0];
        uploadFile(file);
      }
    },
    [uploadMultisigTransaction],
  );

  const onChangeFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        uploadFile(file);
      }
    },
    [uploadMultisigTransaction],
  );

  const uploadFile = useCallback(
    async (file: File) => {
      setLoading(true);
      const isUploadSuccess = await file
        .text()
        .then(uploadMultisigTransaction)
        .catch(() => false);
      setLoading(false);

      if (isUploadSuccess) {
        setErrorMessage(null);
        setFileName(file.name);
      } else {
        setErrorMessage('Invalid transaction format');
        setFileName(null);
      }
    },
    [uploadMultisigTransaction],
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
