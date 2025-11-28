import { useCallback, useMemo } from 'react';

import { formatAddress } from '@common/utils/client-utils';

import { DocumentSignerListItemWrapper } from './document-signer-list.styles';
import { CopyIconButton } from '@components/atoms';
import SuccessIcon from '@assets/success.svg';
import IconShare from '@assets/icon-share';

export interface DocumentSignerListItemProps {
  signerAddress: string;
  order: number;
  status: 'SIGNED' | 'PENDING';
  onClickAddress: (address: string) => void;
}

const DocumentSignerListItem = ({
  signerAddress,
  order,
  status,
  onClickAddress,
}: DocumentSignerListItemProps) => {
  const displaySignerAddress = useMemo(() => {
    return formatAddress(signerAddress, 8);
  }, [signerAddress]);

  const getStatusClassName = useMemo(() => {
    if (status === 'SIGNED') {
      return 'signed';
    }
    if (status === 'PENDING') {
      return 'pending';
    }
    return '';
  }, [status]);

  const statusText = useMemo(() => {
    return status === 'SIGNED' ? 'Signed' : 'Pending';
  }, [status]);

  return (
    <DocumentSignerListItemWrapper>
      <div className='logo-wrapper'>
        <div className='logo'>{order}</div>
        <img className='badge' src={SuccessIcon} alt={'success badge'} />
      </div>

      <div className='title-wrapper'>
        <span className='title'>
          <span className='info'>Signer {order}</span>
          <button className='link-button' onClick={() => onClickAddress(signerAddress)}>
            <IconShare />
          </button>
        </span>
        <span className='description'>
          <span>{displaySignerAddress}</span>
          <CopyIconButton className='copy-button' copyText={signerAddress || ''} size={14} />
        </span>
      </div>

      <div className={`value-wrapper ${getStatusClassName}`}>
        <span className='value'>{statusText}</span>
      </div>
    </DocumentSignerListItemWrapper>
  );
};

export default DocumentSignerListItem;
