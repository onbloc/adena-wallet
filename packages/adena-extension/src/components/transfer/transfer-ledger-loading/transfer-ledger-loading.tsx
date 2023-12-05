import React from 'react';
import { TransferLedgerLoadingWrapper } from './transfer-ledger-loading.styles';
import Icon from '@components/icons';
import TitleWithDesc from '@components/title-with-desc';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import Text from '@components/text';

export interface TransferLedgerLoadingProps {
  onClickCancel: () => void;
}

const text = {
  title: 'Requesting Approval\non Hardware Wallet',
  desc: 'Please approve this transaction on your\nledger device to proceed.',
};

const TransferLedgerLoading: React.FC<TransferLedgerLoadingProps> = ({
  onClickCancel,
}) => {
  return (
    <TransferLedgerLoadingWrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc title={text.title} desc={text.desc} />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
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