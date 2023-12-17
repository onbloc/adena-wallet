import React from 'react';

import { Text, Icon, Button, ButtonHierarchy } from '@components/atoms';
import { TitleWithDesc } from '@components/molecules';
import { ApproveLedgerLoadingWrapper } from './approve-ledger-loading.styles';

export interface ApproveLedgerLoadingProps {
  onClickCancel: () => void;
}

export const ApproveLedgerLoading: React.FC<ApproveLedgerLoadingProps> = ({ onClickCancel }) => {
  return (
    <ApproveLedgerLoadingWrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc
        title={'Requesting Approval\non Hardware Wallet'}
        desc={'Please approve this transaction on your\nledger device to proceed.'}
      />
      <Button
        fullWidth
        hierarchy={ButtonHierarchy.Dark}
        className={'cancel-button'}
        margin='auto 0px 0px'
        onClick={onClickCancel}
      >
        <Text type='body1Bold'>Cancel</Text>
      </Button>
    </ApproveLedgerLoadingWrapper>
  );
};
