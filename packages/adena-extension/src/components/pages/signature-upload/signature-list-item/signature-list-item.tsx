// signer-list-item.tsx
import React from 'react';
import { useTheme } from 'styled-components';

import { formatAddress } from '@common/utils/client-utils';

import { StyledSignerItemWrapper, StyledRemoveButton } from './signature-list-item.styles';
import { CopyIconButton, Icon } from '@components/atoms';
import SuccessIcon from '@assets/success.svg';

interface SignerInfo {
  index: number;
  address: string;
  publicKey: string;
  isSigned: boolean;
}

interface SignerListItemProps {
  signer: SignerInfo;
  onRemove: (publicKey: string) => void;
}

const SignerListItem: React.FC<SignerListItemProps> = ({ signer, onRemove }) => {
  const theme = useTheme();
  const borderColor = signer.isSigned ? theme.green._5 : 'transparent';
  const displayAddress = formatAddress(signer.address, 8);

  return (
    <StyledSignerItemWrapper borderColor={borderColor}>
      <div className='logo-wrapper'>
        <div className='logo'>{signer.index}</div>
        {signer.isSigned && <img className='badge' src={SuccessIcon} alt='success badge' />}
      </div>

      <div className='title-wrapper'>
        <span className='title'>
          <span className='info'>Signer {signer.index}</span>
        </span>
        <span className='description'>
          <span>{displayAddress}</span>
          <CopyIconButton className='copy-button' copyText={signer.address} size={14} />
        </span>
      </div>

      {signer.isSigned && (
        <StyledRemoveButton onClick={() => onRemove(signer.publicKey)}>
          <Icon name='iconCancel' />
        </StyledRemoveButton>
      )}
    </StyledSignerItemWrapper>
  );
};

export default SignerListItem;
