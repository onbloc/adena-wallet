import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
  MSG_REVOKE_SESSION_ENDPOINT,
} from 'adena-module';
import {
  validateTransactionMessageOfCreateSession,
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
