import { toBase64 } from '@cosmjs/encoding';

import { TransactionHistoryItem } from '../../../../../../src/infrastructure/http/onbloc-api.client';
import { mapApiHistoryItem, titleFromMessageType, toHexHash } from '../../../../../../src/repositories/chain/gno/history/gno-api-history.mapper';

const ME = 'g1me';
const HASH = 'ab'.repeat(32);
const item = (overrides: Partial<TransactionHistoryItem> = {}): TransactionHistoryItem => ({
  amountIn: { denom: 'ugnot', value: '5' },
  amountOut: { denom: 'ugnot', value: '9' },
  blockHeight: 10,
  fee: { denom: 'ugnot', value: '1000' },
  func: [{ funcType: '', messageType: '/bank.MsgSend', pkgPath: '' }],
  isGRC20Transfer: false,
  isGRC721Transfer: false,
  messageCount: 1,
  successYn: true,
  timestamp: '2026-11-20T10:00:00Z',
  fromAddress: 'g1other',
  toAddress: ME,
  txHash: HASH,
  ...overrides,
});
const withMessage = (messageType: string, funcType = '', overrides: Partial<TransactionHistoryItem> = {}) =>
  mapApiHistoryItem(item({ func: [{ funcType, messageType, pkgPath: 'gno.land/r/demo/x' }], ...overrides }), ME);

describe('toHexHash', () => {
  it('lowercases hex hashes', () => {
    expect(toHexHash('AB'.repeat(32))).toBe(HASH);
    expect(toHexHash(HASH)).toBe(HASH);
  });

  it('converts base64 hashes', () => {
    expect(toHexHash(toBase64(new Uint8Array(32).fill(0xab)))).toBe(HASH);
  });

  it('returns undecodable input unchanged', () => {
    expect(toHexHash('not base64!')).toBe('not base64!');
  });
});

describe('titleFromMessageType', () => {
  it.each([
    ['/vm.m_call', 'Call'],
    ['/auth.m_create_session', 'Create Session'],
    ['/auth.m_revoke_all_sessions', 'Revoke All Sessions'],
    ['/bank.MsgSend', 'MsgSend'],
    ['/vm.m__double', 'Double'],
    ['plain', 'Plain'],
    ['', 'Contract Interaction'],
    ['/./', 'Contract Interaction'],
    [undefined, 'Contract Interaction'],
  ])('%p → %p', (messageType, title) => {
    expect(titleFromMessageType(messageType)).toBe(title);
  });
});

describe('mapApiHistoryItem', () => {
  it('maps the common fields', () => {
    expect(mapApiHistoryItem(item(), ME)).toEqual({
      hash: HASH,
      height: 10,
      status: 'SUCCESS',
      networkFee: { value: '1000', denom: 'ugnot' },
      from: 'g1other',
      to: ME,
      timestamp: '2026-11-20T10:00:00Z',
      type: 'TRANSFER',
      typeName: 'Receive',
      title: 'Receive',
      direction: 'in',
      amount: { value: '5', denom: 'ugnot' },
    });
  });

  it('maps failures and blank addresses', () => {
    expect(mapApiHistoryItem(item({ successYn: false, fromAddress: '', toAddress: '' }), ME)).toMatchObject({ status: 'FAIL', from: undefined, to: undefined, title: 'Send', direction: 'out' });
  });

  it('counts multi-message transactions', () => {
    expect(withMessage('/vm.m_call', 'Swap', { messageCount: 3 })).toMatchObject({ type: 'MULTI_CONTRACT_CALL', typeName: 'Swap', title: 'Swap', direction: 'in', extraInfo: '+2' });
    expect(withMessage('/vm.m_call', '', { messageCount: 2, toAddress: 'g1x' })).toMatchObject({ title: 'Call', direction: 'none', extraInfo: '+1' });
  });

  it('maps sends with the outgoing amount', () => {
    expect(mapApiHistoryItem(item({ fromAddress: ME, toAddress: 'g1x' }), ME)).toMatchObject({ type: 'TRANSFER', title: 'Send', direction: 'out', amount: { value: '9', denom: 'ugnot' } });
  });

  it('maps GRC20 transfers and normalizes sequenced denoms', () => {
    expect(withMessage('/vm.m_call', 'Transfer', { isGRC20Transfer: true, amountIn: { denom: 'gno.land/r/gnoswap/gns.GNS.0000000', value: '42' } }))
      .toMatchObject({ type: 'TRANSFER', title: 'Receive', amount: { value: '42', denom: 'gno.land/r/gnoswap/gns.GNS' } });
  });

  it('fills missing amount parts and drops empty amounts', () => {
    expect(mapApiHistoryItem(item({ amountIn: { denom: '', value: '7' } }), ME).amount).toEqual({ value: '7', denom: 'ugnot' });
    expect(mapApiHistoryItem(item({ amountIn: { denom: 'ugnot', value: '' } }), ME).amount).toEqual({ value: '0', denom: 'ugnot' });
    expect(mapApiHistoryItem(item({ amountIn: { denom: '', value: '' } }), ME).amount).toBeUndefined();
    expect(mapApiHistoryItem(item({ amountIn: undefined as never }), ME).amount).toBeUndefined();
    expect(mapApiHistoryItem(item({ fee: { denom: '', value: '1' } }), ME).networkFee).toEqual({ value: '1', denom: '' });
    expect(mapApiHistoryItem(item({ fee: undefined as never }), ME).networkFee).toBeUndefined();
  });

  it('maps contract calls and GRC721 transfers', () => {
    expect(withMessage('/vm.m_call', 'Mint')).toMatchObject({ type: 'CONTRACT_CALL', typeName: 'Contract Interaction', title: 'Mint', direction: 'none', amount: { value: '9' } });
    expect(withMessage('/vm.m_call', '', { isGRC721Transfer: true, amountOut: { denom: 'gno.land/r/demo/nft', value: '1' } }))
      .toMatchObject({ type: 'TRANSFER_GRC721', title: 'Call', amount: { value: '1', denom: 'gno.land/r/demo/nft' } });
  });

  it('maps package deployments', () => {
    expect(withMessage('/vm.m_addpkg')).toMatchObject({ type: 'ADD_PACKAGE', typeName: 'Add Package', title: 'AddPkg', direction: 'none' });
    expect(withMessage('/vm.m_addpkg').amount).toBeUndefined();
  });

  it.each(['/auth.m_create_session', '/auth.m_revoke_session', '/auth.m_revoke_all_sessions'])('maps session message %s', (type) => {
    expect(withMessage(type)).toMatchObject({ type: 'CONTRACT_CALL', typeName: 'Session Account', direction: 'none' });
  });

  it.each([['/vm.m_enable_package', 'Enable Package'], ['/vm.m_reject_package', 'Reject Package']])('maps package approval %s', (type, title) => {
    expect(withMessage(type)).toMatchObject({ type: 'CONTRACT_CALL', typeName: 'Package Approval', title });
  });

  it('maps MsgRun', () => {
    expect(withMessage('/vm.m_run', 'ignored')).toMatchObject({ type: 'CONTRACT_CALL', typeName: 'Run', title: 'Run', amount: { value: '9' } });
  });

  it('maps unknown or missing messages as contract interactions', () => {
    expect(withMessage('/foo.m_bar_baz')).toMatchObject({ type: 'CONTRACT_CALL', typeName: 'Contract Interaction', title: 'Bar Baz' });
    expect(mapApiHistoryItem(item({ func: [] }), ME)).toMatchObject({ type: 'CONTRACT_CALL', title: 'Contract Interaction' });
    expect(mapApiHistoryItem(item({ func: undefined as never }), ME)).toMatchObject({ type: 'CONTRACT_CALL', title: 'Contract Interaction' });
  });
});
