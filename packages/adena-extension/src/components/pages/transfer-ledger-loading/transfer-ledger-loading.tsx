import { getLedgerDocumentData } from '@common/utils/ledger-document';
import { Icon } from '@components/atoms';
import { Datatable } from '@components/atoms/datatable';
import { BottomFixedButton, TitleWithDesc } from '@components/molecules';
import { Document } from 'adena-module';
import React, { useMemo } from 'react';

import { TransferLedgerLoadingWrapper } from './transfer-ledger-loading.styles';

export interface TransferLedgerLoadingProps {
  document: Document | null;
  onClickCancel: () => void;
}

const text = {
  title: 'Requesting Approval\non Hardware Wallet',
  desc: 'Please approve this transaction on your\nledger device to proceed.',
};

const TransferLedgerLoading: React.FC<TransferLedgerLoadingProps> = ({
  document,
  onClickCancel,
}) => {
  const documentData = useMemo(() => getLedgerDocumentData(document), [document]);

  return (
    <TransferLedgerLoadingWrapper>
      <Icon name='iconConnectLoading' className='icon' />
      <TitleWithDesc title={text.title} desc={text.desc} />

      {documentData && (
        <div className='data-wrapper'>
          <Datatable data={documentData} />
        </div>
      )}
      <BottomFixedButton text='Cancel' onClick={onClickCancel} />
    </TransferLedgerLoadingWrapper>
  );
};

export default TransferLedgerLoading;
