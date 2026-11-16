import React, { useMemo } from 'react';
import { Document } from 'adena-module';

import { Icon } from '@components/atoms';
import { BottomFixedButton, TitleWithDesc } from '@components/molecules';
import { TransferLedgerLoadingWrapper } from './transfer-ledger-loading.styles';
import { Datatable } from '@components/atoms/datatable';

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
  const documentData = useMemo(() => {
    if (!document) {
      return null;
    }
    const gasFee = document.fee.amount[0]
      ? `${document.fee.amount[0]?.amount}${document.fee.amount[0]?.denom}`
      : '';
    return [
      { key: 'Chain ID', value: document.chain_id },
      { key: 'Account', value: document.account_number },
      { key: 'Sequence', value: document.sequence },
      { key: 'Gas Fee', value: gasFee },
      { key: 'Gas Wanted', value: document.fee.gas },
    ];
  }, [document]);

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
