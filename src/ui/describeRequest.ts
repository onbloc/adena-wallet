import { SignRequestType } from '../wallet/constants';
import type { SignRequest } from '../wallet/sdk/types';

export type RequestSummary = {
  title: string;
  rows: [label: string, value: string][];
};

/** What the signing popup shows for a request. */
export function describeRequest(request: SignRequest): RequestSummary {
  if (request.type === SignRequestType.Transfer) {
    return {
      title: 'Sign transfer',
      rows: [
        ['From', request.from],
        ['To', request.to],
        ['Amount', `${request.amount} ${request.token}`],
        ['Chain', request.chainId],
        ['Nonce', String(request.nonce)],
      ],
    };
  }
  if (request.type === SignRequestType.Allowance) {
    return {
      title: 'Sign approval',
      rows: [
        ['Owner', request.from],
        ['Spender', request.spender],
        ['Amount', `${request.amount} ${request.token}`],
        ['Chain', request.chainId],
        ['Nonce', String(request.nonce)],
      ],
    };
  }
  return {
    title: 'Sign message',
    rows: [
      ['Signer', request.signer],
      ['Message', request.text],
    ],
  };
}
