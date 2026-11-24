import { TransactionType } from '../../agent';
import type { AllowanceSummary, TransferSummary } from '../../agent';

export type TransactionDescription = {
  title: string;
  rows: [label: string, value: string][];
};

/** What the app shows for a prepared transaction. */
export function describeTransaction(summary: TransferSummary | AllowanceSummary): TransactionDescription {
  const amount = `${summary.amount} ${summary.token}`;
  if (summary.type === TransactionType.Transfer) {
    return {
      title: 'Transfer prepared',
      rows: [
        ['From', summary.from],
        ['To', summary.to],
        ['Amount', amount],
        ['Chain', summary.chainId],
      ],
    };
  }
  return {
    title: 'Approval prepared',
    rows: [
      ['Owner', summary.from],
      ['Spender', summary.spender],
      ['Amount', amount],
      ['Chain', summary.chainId],
    ],
  };
}
