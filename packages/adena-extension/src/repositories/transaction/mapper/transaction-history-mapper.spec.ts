import { TransactionHistoryItem } from '../response/transaction-history-response';
import { TransactionHistoryMapper, normalizeTokenDenom } from './transaction-history-mapper';

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

const mapWith = (
  item: TransactionHistoryItem,
  accountAddress: string,
): ReturnType<typeof TransactionHistoryMapper.fromResponse>['transactions'][number] =>
  TransactionHistoryMapper.fromResponse(
    { page: { cursor: '', hasNext: false }, items: [item] },
    accountAddress,
  ).transactions[0];

const mapOne = (
  item: TransactionHistoryItem,
): ReturnType<typeof TransactionHistoryMapper.fromResponse>['transactions'][number] =>
  mapWith(item, 'g1master');

describe('TransactionHistoryMapper session attribution', () => {
  // The rows must come from the transaction, not the current account, so a
  // session-signed tx keeps its master/session pair in the master's history.
  it('carries callerAddress and sessionAddress through the mapper', () => {
    const mapped = mapOne(baseItem({ callerAddress: 'g1master', sessionAddress: 'g1session' }));

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

describe('TransactionHistoryMapper transfer counterparty (To/From)', () => {
  // Direction is decided relative to the queried account: to === account means a
  // Receive (show the sender), otherwise a Send (show the recipient).
  const transferItem = { fromAddress: 'g1sender', toAddress: 'g1recipient' };

  it('shows the recipient (To) for a sent bank.MsgSend', () => {
    const mapped = mapWith(baseItem(transferItem), 'g1sender');

    expect(mapped.typeName).toBe('Send');
    expect(mapped.description).toBe('To: g1recipient');
  });

  it('shows the sender (From) for a received bank.MsgSend', () => {
    const mapped = mapWith(baseItem(transferItem), 'g1recipient');

    expect(mapped.typeName).toBe('Receive');
    expect(mapped.description).toBe('From: g1sender');
  });

  it('shows the recipient (To) for a sent GRC20 transfer', () => {
    const mapped = mapWith(
      baseItem({
        ...transferItem,
        isGRC20Transfer: true,
        func: [{ funcType: 'Transfer', messageType: '/vm.m_call', pkgPath: '' }],
      }),
      'g1sender',
    );

    expect(mapped.typeName).toBe('Send');
    expect(mapped.description).toBe('To: g1recipient');
  });

  it('shows the sender (From) for a received GRC20 transfer', () => {
    const mapped = mapWith(
      baseItem({
        ...transferItem,
        isGRC20Transfer: true,
        func: [{ funcType: 'Transfer', messageType: '/vm.m_call', pkgPath: '' }],
      }),
      'g1recipient',
    );

    expect(mapped.typeName).toBe('Receive');
    expect(mapped.description).toBe('From: g1sender');
  });
});

describe('TransactionHistoryMapper package approval and unknown message types', () => {
  it('maps /vm.m_enable_package to an Enable Package row', () => {
    const mapped = mapOne(
      baseItem({
        amountOut: { denom: 'ugnot', value: '0' },
        func: [
          { funcType: 'EnablePkg', messageType: '/vm.m_enable_package', pkgPath: 'gno.land/r/x' },
        ],
      }),
    );

    expect(mapped.type).toBe('CONTRACT_CALL');
    expect(mapped.typeName).toBe('Package Approval');
    expect(mapped.title).toBe('Enable Package');
  });

  // Older API deployments and the per-token GRC20 history endpoint return the
  // raw stored message type with an empty funcType. The row must still get a
  // title instead of rendering blank.
  it('maps the raw enable_package message type with an empty funcType', () => {
    const mapped = mapOne(
      baseItem({ func: [{ funcType: '', messageType: 'enable_package', pkgPath: '' }] }),
    );

    expect(mapped.typeName).toBe('Package Approval');
    expect(mapped.title).toBe('Enable Package');
  });

  it('maps /vm.m_reject_package to a Reject Package row', () => {
    const mapped = mapOne(
      baseItem({ func: [{ funcType: '', messageType: '/vm.m_reject_package', pkgPath: '' }] }),
    );

    expect(mapped.title).toBe('Reject Package');
  });

  it('maps /vm.m_run to a Run row using the sent amount', () => {
    const mapped = mapOne(
      baseItem({
        amountOut: { denom: 'ugnot', value: '500' },
        func: [{ funcType: 'MsgRun', messageType: '/vm.m_run', pkgPath: '' }],
      }),
    );

    expect(mapped.type).toBe('CONTRACT_CALL');
    expect(mapped.title).toBe('Run');
    expect(mapped.amount).toEqual({ value: '500', denom: 'ugnot' });
  });

  it('derives a title from an unknown message type when funcType is empty', () => {
    const mapped = mapOne(
      baseItem({ func: [{ funcType: '', messageType: '/vm.m_some_new_thing', pkgPath: '' }] }),
    );

    expect(mapped.title).toBe('Some New Thing');
  });

  it('falls back to Contract Interaction when both funcType and messageType are empty', () => {
    const mapped = mapOne(baseItem({ func: [{ funcType: '', messageType: '', pkgPath: '' }] }));

    expect(mapped.title).toBe('Contract Interaction');
  });

  it('never renders an empty title for a single-message vm.m_call', () => {
    const mapped = mapOne(
      baseItem({ func: [{ funcType: '', messageType: '/vm.m_call', pkgPath: 'gno.land/r/x' }] }),
    );

    expect(mapped.title).toBe('Call');
  });
});

describe('TransactionHistoryMapper GRC20 token-ID denom normalization', () => {
  it('strips the numeric sequence suffix from a full token ID denom', () => {
    expect(normalizeTokenDenom('gno.land/r/gnoswap/gns.GNS.0000000')).toBe(
      'gno.land/r/gnoswap/gns.GNS',
    );
  });

  it('leaves token keys, package paths and native denoms untouched', () => {
    expect(normalizeTokenDenom('gno.land/r/gnoswap/gns.GNS')).toBe('gno.land/r/gnoswap/gns.GNS');
    expect(normalizeTokenDenom('gno.land/r/gnoswap/gns')).toBe('gno.land/r/gnoswap/gns');
    expect(normalizeTokenDenom('ugnot')).toBe('ugnot');
  });

  // The per-token GRC20 history endpoint reports amounts in the API token ID;
  // the wallet's token metadata is keyed by `{packagePath}.{symbol}`.
  it('normalizes the amount denom of a per-token GRC20 transfer row', () => {
    const mapped = mapWith(
      baseItem({
        amountIn: { denom: 'gno.land/r/gnoswap/gns.GNS.0000000', value: '0' },
        amountOut: { denom: 'gno.land/r/gnoswap/gns.GNS.0000000', value: '1000000' },
        func: [
          { funcType: 'Transfer', messageType: '/vm.m_call', pkgPath: 'gno.land/r/gnoswap/gns' },
        ],
        isGRC20Transfer: true,
        fromAddress: 'g1master',
        toAddress: 'g1recipient',
      }),
      'g1master',
    );

    expect(mapped.title).toBe('Send');
    expect(mapped.amount).toEqual({ value: '1000000', denom: 'gno.land/r/gnoswap/gns.GNS' });
  });
});
