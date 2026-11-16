import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { ErrorText, Text, WebImg } from '@components/atoms';
import { StyledHiddenInput, StyledInputLabel, StyledWrapper } from './broadcast-transaction-upload-input.styles';
import IconFile from '@assets/file.svg';
import { Tx } from '@gnolang/tm2-js-client';
import IconUpload from '@assets/icon-upload';

export interface BroadcastTransactionUploadInputProps {
  transaction: Tx | null;
  uploadTransaction: (text: string) => boolean;
}

const BroadcastTransactionUploadInput: React.FC<BroadcastTransactionUploadInputProps> = ({
  transaction,
  uploadTransaction,
}) => {
  const theme = useTheme();
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

  const onDropFile = useCallback(async (event: React.DragEvent<HTMLLabelElement>) => {
    if (event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      uploadFile(file);
    }
  }, []);

  const onChangeFileInput = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      uploadFile(file);
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setLoading(true);
    const isUploadSuccess = await file.text()
      .then(uploadTransaction)
      .catch(() => false);
    setLoading(false);

    if (isUploadSuccess) {
      setErrorMessage(null);
      setFileName(file.name);
    } else {
      setErrorMessage('Invalid transaction format');
      setFileName(null);
    }
  }, [])

  return (
    <StyledWrapper>
      <StyledInputLabel
        htmlFor='fileUpload'
        onDrop={onDropFile}
      >
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
        id="fileUpload"
        type="file"
        accept=".txt,.tx"
        onChange={onChangeFileInput}
      />
    </StyledWrapper>
  );
};

export default BroadcastTransactionUploadInput;