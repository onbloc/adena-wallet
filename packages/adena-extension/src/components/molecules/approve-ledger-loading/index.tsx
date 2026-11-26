import { getLedgerDocumentData } from '@common/utils/ledger-document';
import { Icon } from '@components/atoms';
import { Datatable } from '@components/atoms/datatable';
import { BottomFixedButton, TitleWithDesc } from '@components/molecules';
import { Document } from 'adena-module';
import React, { useMemo } from 'react';

import { ApproveLedgerLoadingWrapper } from './approve-ledger-loading.styles';

export interface ApproveLedgerLoadingProps {
  document: Document | null;
  onClickCancel: () => void;
}

export const ApproveLedgerLoading: React.FC<ApproveLedgerLoadingProps> = ({
  document,
  onClickCancel,
}) => {
  const documentData = useMemo(() => getLedgerDocumentData(document), [document]);

  return (
    <ApproveLedgerLoadingWrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc
        title={'Requesting Approval\non Hardware Wallet'}
        desc={'Please approve this transaction on your\nledger device to proceed.'}
      />

      {documentData && (
        <div className='data-wrapper'>
          <Datatable data={documentData} />
        </div>
      )}
      <BottomFixedButton text='Cancel' onClick={onClickCancel} />
    </ApproveLedgerLoadingWrapper>
  );
};
