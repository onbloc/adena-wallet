import React from 'react';

import { Text, Icon, Button } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { TransferLedgerLoadingWrapper } from './transfer-ledger-loading.styles';

export interface TransferLedgerLoadingProps {
  onClickCancel: () => void;
}

const text = {
  title: 'Requesting Approval\non Hardware Wallet',
  desc: 'Please approve this transaction on your\nledger device to proceed.',
};

const TransferLedgerLoading: React.FC<TransferLedgerLoadingProps> = ({ onClickCancel }) => {
  return (
    <TransferLedgerLoadingWrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy='dark'
        className={'cancel-button'}
        margin='0px auto'
        onClick={onClickCancel}
      >
        <Text type='body1Bold'>Cancel</Text>
      </Button>
    </TransferLedgerLoadingWrapper>
  );
};

export default TransferLedgerLoading;
