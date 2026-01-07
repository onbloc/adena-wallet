import React, { useCallback, useMemo, useState } from 'react';

import { Signature } from '@inject/types';
import { SignerPublicKeyInfo } from 'adena-module';
import { SignatureUploadResult } from '@hooks/wallet/broadcast-transaction/use-broadcast-multisig-transaction-screen';

import { ErrorText } from '@components/atoms';
import {
  StyledHiddenInput,
  StyledWrapper,
  StyledSignerListWrapper,
} from './broadcast-multisig-signature-upload-input.styles';
import { SignatureUploadLabel, SignerListItem } from '@components/pages/signature-upload';

export interface BroadcastMultisigSignatureUploadInputProps {
  signatures: Signature[];
  uploadSignature: (text: string) => SignatureUploadResult;
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
      let invalidFormatCount = 0;
      let invalidSignerCount = 0;
      let duplicateCount = 0;

      for (const file of files) {
        try {
          const text = await file.text();
          const result = uploadSignature(text);

          if (result.success) {
            successCount++;
          } else {
            switch (result.error) {
              case 'INVALID_FORMAT':
                invalidFormatCount++;
                break;
              case 'INVALID_SIGNER':
                invalidSignerCount++;
                break;
              case 'DUPLICATE':
                duplicateCount++;
                break;
            }
          }
        } catch {
          invalidFormatCount++;
        }
      }

      setLoading(false);

      const failCount = invalidFormatCount + invalidSignerCount + duplicateCount;

      if (failCount > 0) {
        if (files.length === 1) {
          if (invalidFormatCount > 0) {
            setErrorMessage('Invalid signature format');
          } else if (invalidSignerCount > 0) {
            setErrorMessage('Not a valid signer for this account');
          } else if (duplicateCount > 0) {
            setErrorMessage('Duplicate signature');
          }
          return;
        }

        const messageParts: string[] = [];

        if (successCount > 0) {
          messageParts.push(`${successCount} uploaded`);
        }

        const failDetails: string[] = [];
        if (invalidFormatCount > 0) {
          failDetails.push(`invalid format: ${invalidFormatCount}`);
        }
        if (invalidSignerCount > 0) {
          failDetails.push(`not a signer: ${invalidSignerCount}`);
        }
        if (duplicateCount > 0) {
          failDetails.push(`duplicate: ${duplicateCount}`);
        }

        if (failDetails.length > 0) {
          messageParts.push(`${failCount} failed (${failDetails.join(', ')})`);
        }

        setErrorMessage(messageParts.join(', '));
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
