// signature-upload-label.tsx
import React from 'react';
import { useTheme } from 'styled-components';

import { Text, WebImg } from '@components/atoms';
import { StyledInputLabel } from './signature-upload-label.styles';
import IconUpload from '@assets/icon-upload';
import IconFile from '@assets/file.svg';

interface SignatureUploadLabelProps {
  loading: boolean;
  signedCount: number;
  threshold: number;
  hasSignatures: boolean;
  onDrop: (event: React.DragEvent<HTMLLabelElement>) => void;
}

const SignatureUploadLabel: React.FC<SignatureUploadLabelProps> = ({
  loading,
  signedCount,
  threshold,
  hasSignatures,
  onDrop,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <StyledInputLabel htmlFor='signatureUpload' onDrop={onDrop}>
        <IconUpload fill='inherit' />
        <Text type='body2Reg' color={theme.neutral.a}>
          {'Uploading signatures...'}
        </Text>
      </StyledInputLabel>
    );
  }

  if (hasSignatures) {
    return (
      <StyledInputLabel htmlFor='signatureUpload' onDrop={onDrop}>
        <WebImg src={IconFile} size={32} />
        <Text type='body2Reg' color={theme.neutral._1}>
          {`${signedCount} of ${threshold} required signatures uploaded`}
        </Text>
        <Text type='body3Reg' color={theme.neutral.a}>
          {'Click to upload more'}
        </Text>
      </StyledInputLabel>
    );
  }

  return (
    <StyledInputLabel htmlFor='signatureUpload' onDrop={onDrop}>
      <IconUpload fill='inherit' />
      <Text type='body2Reg' color='inherit'>
        {'Drag & drop signature files or click to upload'}
      </Text>
    </StyledInputLabel>
  );
};

export default SignatureUploadLabel;
