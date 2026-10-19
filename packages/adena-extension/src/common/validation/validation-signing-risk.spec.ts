import {
  MSG_CREATE_SESSION_ENDPOINT,
  MSG_REVOKE_ALL_SESSIONS_ENDPOINT,
} from 'adena-module';
import { classifyGnoSigningRisk } from './validation-signing-risk';

const codes = (messages: any[], context = {}): string[] =>
  classifyGnoSigningRisk(messages, context).reasons.map((reason) => reason.code);

describe('classifyGnoSigningRisk', () => {
  it('treats an empty or missing message list as high risk', () => {
    expect(classifyGnoSigningRisk([]).level).toBe('high');
    expect(classifyGnoSigningRisk(undefined).level).toBe('high');
  });

  it('treats MsgRun and MsgAddPackage as high risk', () => {
    expect(classifyGnoSigningRisk([{ type: '/vm.m_run', value: {} }]).level).toBe('high');
    expect(classifyGnoSigningRisk([{ type: '/vm.m_addpkg', value: {} }]).level).toBe('high');
  });

  it('flags session creation, wildcard paths and a missing spend limit', () => {
    const message = {
      type: MSG_CREATE_SESSION_ENDPOINT,
      value: { allow_paths: ['*'], spend_limit: '' },
    };
    expect(classifyGnoSigningRisk([message]).level).toBe('high');
    expect(codes([message])).toEqual([
      'CREATE_SESSION',
      'SESSION_ALL_PATHS',
      'SESSION_WITHOUT_SPEND_LIMIT',
    ]);
  });

  it('keeps a scoped, limited session at high risk without the extra reasons', () => {
    const message = {
      type: MSG_CREATE_SESSION_ENDPOINT,
      value: { allow_paths: ['gno.land/r/demo/game'], spend_limit: '1000ugnot' },
    };
    expect(codes([message])).toEqual(['CREATE_SESSION']);
  });

  it('treats revoking sessions as low risk', () => {
    expect(classifyGnoSigningRisk([{ type: MSG_REVOKE_ALL_SESSIONS_ENDPOINT, value: {} }])).toEqual(
      { level: 'low', reasons: [] },
    );
  });

  it('grades a call to an unknown realm, approvals and attached funds as medium', () => {
    const message = {
      type: '/vm.m_call',
      value: { pkg_path: 'gno.land/r/unknown/token', func: 'Approve', send: '1ugnot', args: [] },
    };
    expect(classifyGnoSigningRisk([message]).level).toBe('medium');
    expect(codes([message])).toEqual(['CALL_UNKNOWN_REALM', 'TOKEN_APPROVAL', 'ATTACHED_FUNDS']);
  });

  it('grades a call to a known realm without funds as low', () => {
    const message = {
      type: '/vm.m_call',
      value: { pkg_path: 'gno.land/r/demo/boards', func: 'CreateThread', send: '', args: [] },
    };
    const knownRealmPaths = new Set(['gno.land/r/demo/boards']);
    expect(classifyGnoSigningRisk([message], { knownRealmPaths }).level).toBe('low');
  });

  it('grades a transfer by whether the recipient is known', () => {
    const message = { type: '/bank.MsgSend', value: { to_address: 'g1friend', amount: '1ugnot' } };
    expect(codes([message])).toEqual(['NEW_RECIPIENT']);
    expect(
      classifyGnoSigningRisk([message], { knownRecipients: new Set(['g1friend']) }).level,
    ).toBe('low');
  });

  it('treats an unrecognized message type as high risk', () => {
    expect(codes([{ type: '/cosmos.authz.v1beta1.MsgGrant', value: {} }])).toEqual([
      'UNKNOWN_MESSAGE',
    ]);
  });

  it('takes the highest level across messages and keeps each message index', () => {
    const result = classifyGnoSigningRisk([
      { type: '/bank.MsgSend', value: { to_address: 'g1new', amount: '1ugnot' } },
      { type: '/vm.m_run', value: {} },
    ]);
    expect(result.level).toBe('high');
    expect(result.reasons.map((reason) => reason.messageIndex)).toEqual([0, 1]);
  });
});
