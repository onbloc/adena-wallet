import React, { useCallback, useMemo, useState } from 'react';

import { Signature } from '@inject/types';
import { SignerPublicKeyInfo } from 'adena-module';

import { ErrorText } from '@components/atoms';
import {
  StyledHiddenInput,
  StyledWrapper,
  StyledSignerListWrapper,
} from './broadcast-multisig-signature-upload-input.styles';
import { SignatureUploadLabel, SignerListItem } from '@components/pages/signature-upload';

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
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const onDropFile = useCallback(
    async (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      if (event.dataTransfer.files.length > 0) {
        const files = Array.from(event.dataTransfer.files);
        uploadFiles(files);
      }
    },
    [uploadFiles],
  );

  const onChangeFileInput = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        const fileArray = Array.from(files);
        uploadFiles(fileArray);
      }
    },
    [uploadFiles],
  );

  return (
    <StyledWrapper>
      <SignatureUploadLabel
        loading={loading}
        signedCount={signedCount}
        threshold={threshold}
        hasSignatures={signatures.length > 0}
        onDrop={onDropFile}
      />

      {errorMessage && <ErrorText text={errorMessage} />}

      {signerPublicKeys.length > 0 && (
        <StyledSignerListWrapper>
          {signersWithStatus.map((signer) => (
            <SignerListItem key={signer.publicKey} signer={signer} onRemove={removeSignature} />
          ))}
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
