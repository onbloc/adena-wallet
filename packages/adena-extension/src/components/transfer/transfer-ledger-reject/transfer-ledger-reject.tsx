import React from 'react';
import IconConnectFailPermission from '@assets/connect-fail-permission.svg';
import TitleWithDesc from '@components/title-with-desc';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';
import { TransferLedgerRejectWrapper } from './transfer-ledger-reject.styles';

export interface TransferLedgerRejectProps {
  onClickClose: () => void;
}

const text = {
  title: 'Transaction Rejected',
  desc: 'The transaction has been rejected on\nyour ledger device. Please approve the\ntransaction in your wallet to complete\nthe transaction.',
};

const TransferLedgerReject: React.FC<TransferLedgerRejectProps> = ({
  onClickClose,
}) => {
  return (
    <TransferLedgerRejectWrapper>
      <img className='reject-icon' src={IconConnectFailPermission} alt='logo-image' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
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