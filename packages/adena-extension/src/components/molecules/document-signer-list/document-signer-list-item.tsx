import { useMemo } from 'react';

import theme from '@styles/theme';
import { formatAddress } from '@common/utils/client-utils';
import { SignerStatusType } from '@inject/types';

import { DocumentSignerListItemWrapper } from './document-signer-list.styles';
import { CopyIconButton } from '@components/atoms';
import SuccessIcon from '@assets/success.svg';
import IconShare from '@assets/icon-share';

interface StatusStyle {
  color: string;
  className: string;
  statusText: string;
  showLabel: boolean;
  showBadge: boolean;
}

function getStatusStyle(status: SignerStatusType): StatusStyle {
  switch (status) {
    case 'SIGNED':
      return {
        color: theme.green._5,
        className: 'signed',
        statusText: 'Signed',
        showLabel: true,
        showBadge: true,
      };
    case 'UNSIGNED':
      return {
        color: theme.neutral.a,
        className: 'unsigned',
        statusText: 'Unsigned',
        showLabel: true,
        showBadge: false,
      };
    case 'NONE':
    default:
      return {
        color: 'transparent',
        className: 'unsigned',
        statusText: '',
        showLabel: false,
        showBadge: false,
      };
  }
}

export interface DocumentSignerListItemProps {
  signerAddress: string;
  order: number;
  status: SignerStatusType;
  onClickAddress: (address: string) => void;
}

const DocumentSignerListItem = ({
  signerAddress,
  order,
  status,
  onClickAddress,
}: DocumentSignerListItemProps): React.ReactElement => {
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
          <button className='link-button' onClick={(): void => onClickAddress(signerAddress)}>
            <IconShare />
          </button>
        </span>
        <span className='description'>
          <span>{displaySignerAddress}</span>
          <CopyIconButton className='copy-button' copyText={signerAddress || ''} size={14} />
        </span>
      </div>

      {statusStyle.showLabel && (
        <div className={`value-wrapper ${statusStyle.className}`}>
          <span className='value'>{statusStyle.statusText}</span>
        </div>
      )}
    </DocumentSignerListItemWrapper>
  );
};

export default DocumentSignerListItem;
