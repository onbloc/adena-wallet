import React from 'react';

import IconConnectFailPermission from '@assets/connect-fail-permission.svg';

import { Text, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { TransferLedgerRejectWrapper } from './transfer-ledger-reject.styles';

export interface TransferLedgerRejectProps {
  onClickClose: () => void;
  title?: string;
  desc?: string;
}

const DEFAULT_TITLE = 'Transaction Rejected';
const DEFAULT_DESC =
  'The transaction has been rejected on\nyour ledger device. Please approve the\ntransaction in your wallet to complete\nthe transaction.';

const TransferLedgerReject: React.FC<TransferLedgerRejectProps> = ({
  onClickClose,
  title = DEFAULT_TITLE,
  desc = DEFAULT_DESC,
}) => {
  return (
    <TransferLedgerRejectWrapper>
      <img className='reject-icon' src={IconConnectFailPermission} alt='logo-image' />
      <TitleWithDesc title={title} desc={desc} />
      <Button
        fullWidth
        hierarchy='dark'
        className={'close-button'}
        margin='0px auto'
        onClick={onClickClose}
      >
        <Text type='body1Bold'>Close</Text>
      </Button>
    </TransferLedgerRejectWrapper>
  );
};

export default TransferLedgerReject;
