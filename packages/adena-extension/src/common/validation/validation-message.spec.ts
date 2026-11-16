import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';
import {
  validateTransactionMessageOfCreateSession,
  validateTransactionMessageOfEnablePackage,
  validateTransactionMessageOfRejectPackage,
  validateTransactionMessageOfRevokeAllSessions,
  validateTransactionMessageOfRevokeSession,
} from './validation-message';

const sessionKey = {
  type_url: '/tm.PubKeySecp256k1',
  value: [10, 33, 3],
};

describe('session admin transaction message validation', () => {
  it('accepts MsgCreateSession payloads', () => {
    expect(
      validateTransactionMessageOfCreateSession({
        type: MSG_CREATE_SESSION_ENDPOINT,
        value: {
          creator: 'g1creator',
          session_key: sessionKey,
          expires_at: { low: 1, high: 0, unsigned: false },
          allow_paths: ['*'],
          spend_limit: '1000000ugnot',
          spend_period: { low: 0, high: 0, unsigned: false },
        },
      }),
    ).toBe(true);
  });

  it('rejects MsgCreateSession without allow_paths', () => {
    expect(
      validateTransactionMessageOfCreateSession({
        type: MSG_CREATE_SESSION_ENDPOINT,
        value: {
          creator: 'g1creator',
          session_key: sessionKey,
        },
      }),
    ).toBe(false);
  });

  it('accepts MsgRevokeSession payloads', () => {
    expect(
      validateTransactionMessageOfRevokeSession({
        type: MSG_REVOKE_SESSION_ENDPOINT,
        value: {
          creator: 'g1creator',
          session_key: sessionKey,
        },
      }),
    ).toBe(true);
  });

  it('accepts MsgRevokeAllSessions payloads', () => {
    expect(
      validateTransactionMessageOfRevokeAllSessions({
        type: MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
        value: {
          creator: 'g1creator',
        },
      }),
    ).toBe(true);
  });
});

describe('package approval transaction message validation', () => {
  it('accepts MsgEnablePackage payloads', () => {
    expect(
      validateTransactionMessageOfEnablePackage({
        type: '/vm.m_enable_pkg',
        value: {
          approver: 'g1approver',
          pkg_path: 'gno.land/r/demo/foo',
          pkg_hash: 'abc123',
          pkg_height: '42',
        },
      }),
    ).toBe(true);
  });

  it('rejects MsgEnablePackage payloads with missing fields', () => {
    expect(
      validateTransactionMessageOfEnablePackage({
        type: '/vm.m_enable_pkg',
        value: { approver: 'g1approver', pkg_path: 'gno.land/r/demo/foo' },
      }),
    ).toBe(false);
  });

  it('accepts MsgRejectPackage payloads', () => {
    expect(
      validateTransactionMessageOfRejectPackage({
        type: '/vm.m_reject_pkg',
        value: { sender: 'g1sender', pkg_path: 'gno.land/r/demo/foo' },
      }),
    ).toBe(true);
  });

  it('rejects MsgRejectPackage payloads without a sender', () => {
    expect(
      validateTransactionMessageOfRejectPackage({
        type: '/vm.m_reject_pkg',
        value: { pkg_path: 'gno.land/r/demo/foo' },
      }),
    ).toBe(false);
  });
});
