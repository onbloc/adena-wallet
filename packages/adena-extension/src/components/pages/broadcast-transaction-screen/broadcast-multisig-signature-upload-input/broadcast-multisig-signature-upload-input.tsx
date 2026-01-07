import React, { useCallback, useMemo, useState } from 'react';
import { useTheme } from 'styled-components';

import { ErrorText, Text, View, WebImg, CopyIconButton } from '@components/atoms';
import {
  StyledHiddenInput,
  StyledInputLabel,
  StyledWrapper,
  StyledSignerListWrapper,
  StyledSignerItemWrapper,
  StyledRemoveButton,
} from './broadcast-multisig-signature-upload-input.styles';
import IconUpload from '@assets/icon-upload';
import IconFile from '@assets/file.svg';
import SuccessIcon from '@assets/success.svg';
import { Signature } from '@inject/types';
import { SignerPublicKeyInfo } from 'adena-module';
import { formatAddress } from '@common/utils/client-utils';

export interface BroadcastMultisigSignatureUploadInputProps {
  signatures: Signature[];
  uploadSignature: (text: string) => boolean;
  removeSignature: (pubKeyValue: string) => void;
  signerPublicKeys: SignerPublicKeyInfo[];
  threshold: number;
}

const BroadcastMultisigSignatureUploadInput: React.FC<
  BroadcastMultisigSignatureUploadInputProps
> = ({ signatures, uploadSignature, removeSignature, signerPublicKeys, threshold }) => {
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

  const signersWithStatus = useMemo(() => {
    return signerPublicKeys.map((signer, index) => {
      const isSigned = signatures.some(
        (signature) => signature.pub_key.value === signer.publicKey.value,
      );
      return {
        index: index + 1,
        address: signer.address,
        publicKey: signer.publicKey.value,
        isSigned,
      };
    });
  }, [signerPublicKeys, signatures]);

  const signedCount = useMemo(() => {
    return signersWithStatus.filter((s) => s.isSigned).length;
  }, [signersWithStatus]);

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
            <WebImg src={IconFile} size={32} />
            <Text type='body2Reg' color={theme.neutral._1}>
              {`${signedCount} of ${threshold} required signatures uploaded`}
            </Text>
            <Text type='body3Reg' color={theme.neutral.a}>
              {'Click to upload more'}
            </Text>
          </React.Fragment>
        )}
      </StyledInputLabel>

      {hasError && <ErrorText text={errorMessage || ''} />}

      {signerPublicKeys.length > 0 && (
        <StyledSignerListWrapper>
          {signersWithStatus.map((signer) => {
            const borderColor = signer.isSigned ? theme.green._5 : 'transparent';
            const displayAddress = formatAddress(signer.address, 8);

            return (
              <StyledSignerItemWrapper key={signer.publicKey} borderColor={borderColor}>
                <div className='logo-wrapper'>
                  <div className='logo'>{signer.index}</div>
                  {signer.isSigned && (
                    <img className='badge' src={SuccessIcon} alt={'success badge'} />
                  )}
                </div>

                <div className='title-wrapper'>
                  <span className='title'>
                    <span className='info'>Signer {signer.index}</span>
                  </span>
                  <span className='description'>
                    <span>{displayAddress}</span>
                    <CopyIconButton
                      className='copy-button'
                      copyText={signer.address || ''}
                      size={14}
                    />
                  </span>
                </div>

                {signer.isSigned && (
                  <StyledRemoveButton onClick={() => removeSignature(signer.publicKey)}>
                    ✕
                  </StyledRemoveButton>
                )}
              </StyledSignerItemWrapper>
            );
          })}
        </StyledSignerListWrapper>
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
