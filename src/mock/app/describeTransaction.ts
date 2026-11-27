import { TransactionType } from '../../agent';
import type { AllowanceSummary, TransferSummary } from '../../agent';

export type TransactionDescription = {
  title: string;
  rows: [label: string, value: string][];
};

/** What the app shows for a prepared transaction. */
export function describeTransaction(summary: TransferSummary | AllowanceSummary): TransactionDescription {
  const isTransfer = summary.type === TransactionType.Transfer;
  const rows: TransactionDescription['rows'] = [
    [isTransfer ? 'From' : 'Owner', summary.from],
    isTransfer ? ['To', summary.to] : ['Spender', summary.spender],
    ['Amount', `${summary.amount} ${summary.token}`],
  ];
  if (summary.packagePath) rows.push(['Token realm', summary.packagePath]);
  rows.push(['Chain', summary.chainId]);
  return { title: isTransfer ? 'Transfer prepared' : 'Approval prepared', rows };
}
