import { Document } from 'adena-module';

export const getLedgerDocumentData = (document: Document | null): { key: string; value: string }[] | null => {
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
};
