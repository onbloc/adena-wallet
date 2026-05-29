import { Account } from 'adena-module';

import { SessionMetadataV020 } from '@migrates/migrations/v020/storage-model-v020';

import { evaluateSessionSigningGuard } from './session-signing-guard';

const masterAddr = 'g1master';
const sessionAddr = 'g1session';

function sessionAccountMock(): Account {
  // Minimum surface used by the guard; isSessionAccount checks `type`.
  return {
    id: 'sess-1',
    index: 0,
    type: 'SESSION',
    name: 'sess',
    keyringId: 'k',
    publicKey: new Uint8Array(),
    toData: (): any => ({}),
    getAddress: async (): Promise<string> => sessionAddr,
  } as unknown as Account;
}

function masterAccountMock(): Account {
  return {
    id: 'master-1',
    index: 0,
    type: 'HD_WALLET',
    name: 'master',
    keyringId: 'k',
    publicKey: new Uint8Array(),
    toData: (): any => ({}),
    getAddress: async (): Promise<string> => masterAddr,
  } as unknown as Account;
}

function baseMetadata(overrides: Partial<SessionMetadataV020> = {}): SessionMetadataV020 {
  return {
    masterAddress: masterAddr,
    chainId: 'test-13',
    allowPaths: ['*'],
    spendLimit: '1000ugnot',
    spendPeriod: 0,
    expiresAt: 0,
    status: 'ACTIVE',
    createdAt: 0,
    ...overrides,
  };
}

const sendMsg = (from: string, amount: string): { type: string; value: any } => ({
  type: '/bank.MsgSend',
  value: { from_address: from, amount },
});

const callMsg = (pkgPath: string, send = ''): { type: string; value: any } => ({
  type: '/vm.m_call',
  value: { pkg_path: pkgPath, send },
});

const baseFee = { amount: '0', denom: 'ugnot' };

describe('evaluateSessionSigningGuard', () => {
  it('passes when all checks succeed', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata(),
      walletLocked: false,
      nowSeconds: 100,
      currentChainId: 'test-13',
      decodedMessages: [sendMsg(masterAddr, '10ugnot')],
      txFee: baseFee,
    });
    expect(decision.ok).toBe(true);
  });

  it('wallet_locked first', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata(),
      walletLocked: true,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'wallet_locked' });
  });

  it('not_session_account when master selected', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: masterAccountMock(),
      sessionMetadata: null,
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'not_session_account' });
  });

  it('session_admin_msg blocks MsgCreateSession', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata(),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [{ type: '/auth.m_create_session', value: {} }],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'session_admin_msg' });
  });

  it('session_metadata_missing', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: null,
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'session_metadata_missing' });
  });

  it('session_inactive when status is not ACTIVE', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata({ status: 'REVOKED' }),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'session_inactive' });
  });

  it('chain_mismatch when chainId differs', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata({ chainId: 'test-13' }),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'gnoland1',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'chain_mismatch' });
  });

  it('session_expired when expiresAt has passed', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata({ expiresAt: 100 }),
      walletLocked: false,
      nowSeconds: 200,
      currentChainId: 'test-13',
      decodedMessages: [],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'session_expired' });
  });

  it('unsupported_msg_type rejects MsgAddPkg', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata(),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [{ type: '/vm.m_addpkg', value: {} }],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'unsupported_msg_type' });
  });

  it('allowpaths_violation when MsgCall path not allowed', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata({ allowPaths: ['vm/exec:gno.land/r/allowed'] }),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [callMsg('gno.land/r/other')],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'allowpaths_violation' });
  });

  it('spendlimit_exceeded when projected + used > limit', () => {
    const decision = evaluateSessionSigningGuard({
      currentAccount: sessionAccountMock(),
      sessionMetadata: baseMetadata({
        spendLimit: '100ugnot',
        spendUsed: '90ugnot',
      }),
      walletLocked: false,
      nowSeconds: 0,
      currentChainId: 'test-13',
      decodedMessages: [sendMsg(masterAddr, '20ugnot')],
      txFee: baseFee,
    });
    expect(decision).toEqual({ ok: false, reason: 'spendlimit_exceeded' });
  });
});
