import { useMemo } from 'react';

import theme from '@styles/theme';
import { formatAddress } from '@common/utils/client-utils';

import { DocumentSignerListItemWrapper } from './document-signer-list.styles';
import { CopyIconButton } from '@components/atoms';
import SuccessIcon from '@assets/success.svg';
import IconShare from '@assets/icon-share';

interface StatusStyle {
  color: string;
  className: string;
  statusText: string;
  showBadge: boolean;
}

function getStatusStyle(status: 'SIGNED' | 'PENDING'): StatusStyle {
  switch (status) {
    case 'SIGNED':
      return {
        color: theme.green._5,
        className: 'signed',
        statusText: 'Signed',
        showBadge: true,
      };
    case 'PENDING':
      return {
        color: theme.neutral.a,
        className: 'pending',
        statusText: 'Pending',
        showBadge: false,
      };
    default:
      return {
        color: theme.neutral.a,
        className: 'pending',
        statusText: 'Pending',
        showBadge: false,
      };
  }
}

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

  const statusStyle = useMemo(() => getStatusStyle(status), [status]);

  return (
    <DocumentSignerListItemWrapper borderColor={statusStyle.color}>
      <div className='logo-wrapper'>
        <div className='logo'>{order}</div>
        {statusStyle.showBadge && <img className='badge' src={SuccessIcon} alt={'success badge'} />}
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

      <div className={`value-wrapper ${statusStyle.className}`}>
        <span className='value'>{statusStyle.statusText}</span>
      </div>
    </DocumentSignerListItemWrapper>
  );
};

export default DocumentSignerListItem;
