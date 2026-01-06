import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { ErrorText, Text, View, WebImg } from '@components/atoms';
import {
  StyledHiddenInput,
  StyledInputLabel,
  StyledWrapper,
  StyledSignatureList,
  StyledSignatureItem,
  StyledRemoveButton,
} from './broadcast-multisig-signature-upload-input.styles';
import IconUpload from '@assets/icon-upload';
import IconFile from '@assets/file.svg';
import { Signature } from '@inject/types';

export interface BroadcastMultisigSignatureUploadInputProps {
  signatures: Signature[];
  uploadSignature: (text: string) => boolean;
  removeSignature: (pubKeyValue: string) => void;
}

const BroadcastMultisigSignatureUploadInput: React.FC<
  BroadcastMultisigSignatureUploadInputProps
> = ({ signatures, uploadSignature, removeSignature }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasError = useMemo(() => {
    return errorMessage !== null;
  }, [errorMessage]);

  const uploadState = useMemo(() => {
    if (loading) {
      return 'LOADING';
    }
    if (signatures.length > 0) {
      return 'SUCCESS';
    }
    return 'NONE';
  }, [signatures, loading]);

  const onDropFile = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length > 0) {
        const files = Array.from(event.dataTransfer.files);
        uploadFiles(files);
      }
    },
    [uploadSignature],
  );

  const onChangeFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        uploadFiles(fileArray);
      }
    },
    [uploadSignature],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      setLoading(true);
      setErrorMessage(null);

      let successCount = 0;
      let failCount = 0;

      for (const file of files) {
        const isUploadSuccess = await file
          .text()
          .then(uploadSignature)
          .catch(() => false);

        if (isUploadSuccess) {
          successCount++;
        } else {
          failCount++;
        }
      }

      setLoading(false);

      if (failCount > 0) {
        if (successCount > 0) {
          setErrorMessage(
            `${successCount} signature(s) uploaded, ${failCount} failed (invalid format or duplicate)`,
          );
        } else {
          setErrorMessage('Invalid signature format or duplicate signature');
        }
      } else {
        setErrorMessage(null);
      }
    },
    [uploadSignature],
  );

  return (
    <StyledWrapper>
      <StyledInputLabel htmlFor='signatureUpload' onDrop={onDropFile}>
        {uploadState === 'NONE' && (
          <React.Fragment>
            <IconUpload fill='inherit' />
            <Text type='body2Reg' color='inherit'>
              {'Drag & drop signature files or click to upload'}
            </Text>
          </React.Fragment>
        )}
        {uploadState === 'LOADING' && (
          <React.Fragment>
            <IconUpload fill='inherit' />
            <Text type='body2Reg' color={theme.neutral.a}>
              {'Uploading signatures...'}
            </Text>
          </React.Fragment>
        )}
        {uploadState === 'SUCCESS' && (
          <React.Fragment>
            <WebImg src={IconFile} size={32} /> {/* 🔥 IconUpload → WebImg로 변경 */}
            <Text type='body2Reg' color={theme.neutral._1}>
              {' '}
              {/* 🔥 색상도 변경 */}
              {`${signatures.length} signature(s) uploaded`}
            </Text>
            <Text type='body3Reg' color={theme.neutral.a}>
              {'Click to upload more'}
            </Text>
          </React.Fragment>
        )}
      </StyledInputLabel>

      {hasError && <ErrorText text={errorMessage || ''} />}

      {signatures.length > 0 && (
        <StyledSignatureList>
          {signatures.map((sig, index) => (
            <StyledSignatureItem key={sig.pub_key.value}>
              <View style={{ flex: 1 }}>
                <Text type='body2Bold'>Signature {index + 1}</Text>
                <Text type='body3Reg' color={theme.neutral.a}>
                  {sig.pub_key.value.slice(0, 30)}...
                </Text>
              </View>
              <StyledRemoveButton onClick={() => removeSignature(sig.pub_key.value)}>
                ✕
              </StyledRemoveButton>
            </StyledSignatureItem>
          ))}
        </StyledSignatureList>
      )}

      <StyledHiddenInput
        id='signatureUpload'
        type='file'
        accept='.sig'
        multiple
        onChange={onChangeFileInput}
      />
    </StyledWrapper>
  );
};

export default BroadcastMultisigSignatureUploadInput;
