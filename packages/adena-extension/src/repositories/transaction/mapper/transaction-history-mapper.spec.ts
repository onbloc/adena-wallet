import { TransactionHistoryItem } from '../response/transaction-history-response';
import { TransactionHistoryMapper } from './transaction-history-mapper';

const baseItem = (overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem => ({
  amountIn: { denom: 'ugnot', value: '0' },
  amountOut: { denom: 'ugnot', value: '1000000' },
  blockHeight: 100,
  fee: { denom: 'ugnot', value: '1' },
  func: [{ funcType: 'Transfer', messageType: '/bank.MsgSend', pkgPath: '' }],
  isGRC20Transfer: false,
  isGRC721Transfer: false,
  messageCount: 1,
  successYn: true,
  timestamp: '2026-07-09T00:00:00Z',
  fromAddress: 'g1master',
  toAddress: 'g1recipient',
  txHash: 'HASH',
  ...overrides,
});

const mapOne = (item: TransactionHistoryItem): ReturnType<
  typeof TransactionHistoryMapper.fromResponse
>['transactions'][number] =>
  TransactionHistoryMapper.fromResponse(
    { page: { cursor: '', hasNext: false }, items: [item] },
    'g1master',
  ).transactions[0];

describe('TransactionHistoryMapper session attribution', () => {
  // The rows must come from the transaction, not the current account, so a
  // session-signed tx keeps its master/session pair in the master's history.
  it('carries callerAddress and sessionAddress through the mapper', () => {
    const mapped = mapOne(
      baseItem({ callerAddress: 'g1master', sessionAddress: 'g1session' }),
    );

    expect(mapped.callerAddress).toBe('g1master');
    expect(mapped.sessionAddress).toBe('g1session');
  });

  it('leaves sessionAddress empty for a master-key signature', () => {
    const mapped = mapOne(baseItem({ callerAddress: 'g1master', sessionAddress: '' }));

    expect(mapped.callerAddress).toBe('g1master');
    expect(mapped.sessionAddress).toBe('');
  });

  it('defaults both to empty strings when the backend omits them', () => {
    const mapped = mapOne(baseItem());

    expect(mapped.callerAddress).toBe('');
    expect(mapped.sessionAddress).toBe('');
  });
});
