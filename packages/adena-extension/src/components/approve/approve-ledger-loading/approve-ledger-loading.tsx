import React from 'react';
import { ApproveLedgerLoadingWrapper } from './approve-ledger-loading.styles';
import Button, { ButtonHierarchy } from '@components/buttons/button';
import TitleWithDesc from '@components/title-with-desc';
import Text from '@components/text';
import Icon from '@components/icons';

export interface ApproveLedgerLoadingProps {
  onClickCancel: () => void;
}

const ApproveLedgerLoading: React.FC<ApproveLedgerLoadingProps> = ({ onClickCancel }) => {
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

export default ApproveLedgerLoading;