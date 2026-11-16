import { toBase64 } from 'adena-module';

import {
  AGENT_SESSION_MAX_LIFETIME_SECONDS,
  AgentHostRequestError,
  normalizeAgentName,
  parseAgentHostRequest,
  parseCreateSessionParams,
  parseRevokeSessionParams,
  parseSessionPublicKey,
  toErrorResponse,
} from './agent-host-protocol';

const NOW = 1_800_000_000;

const compressedKey = (): Uint8Array => {
  const key = new Uint8Array(33).fill(7);
  key[0] = 0x02;
  return key;
};

const validParams = (): Record<string, unknown> => ({
  session_public_key: toBase64(compressedKey()),
  allow_paths: ['vm/exec:gno.land/r/demo/counter'],
  spend_limit: '5000000ugnot',
  expires_at: NOW + 3600,
  agent_name: 'Claude Code',
});

const expectErrorCode = (fn: () => unknown, code: string): void => {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(AgentHostRequestError);
    expect((error as AgentHostRequestError).code).toBe(code);
    return;
  }
  throw new Error('expected an AgentHostRequestError');
};

describe('parseAgentHostRequest', () => {
  it('accepts a known method with an id', () => {
    expect(parseAgentHostRequest({ id: '1', method: 'ping' })).toEqual({
      id: '1',
      method: 'ping',
      params: undefined,
    });
  });

  it('rejects a missing id', () => {
    expectErrorCode(() => parseAgentHostRequest({ method: 'ping' }), 'invalid_request');
  });

  it('rejects an unknown method', () => {
    expectErrorCode(() => parseAgentHostRequest({ id: '1', method: 'sign_tx' }), 'invalid_request');
  });

  it('rejects non-object params', () => {
    expectErrorCode(
      () => parseAgentHostRequest({ id: '1', method: 'ping', params: ['x'] }),
      'invalid_request',
    );
  });
});

describe('parseSessionPublicKey', () => {
  it('decodes a compressed secp256k1 key', () => {
    expect(parseSessionPublicKey(toBase64(compressedKey()))).toEqual(compressedKey());
  });

  it('rejects an uncompressed key', () => {
    const key = new Uint8Array(65).fill(1);
    key[0] = 0x04;
    expectErrorCode(() => parseSessionPublicKey(toBase64(key)), 'invalid_params');
  });

  it('rejects a key with a bad prefix byte', () => {
    const key = compressedKey();
    key[0] = 0x05;
    expectErrorCode(() => parseSessionPublicKey(toBase64(key)), 'invalid_params');
  });
});

describe('parseCreateSessionParams', () => {
  it('parses valid params and normalizes the agent name', () => {
    const parsed = parseCreateSessionParams(validParams(), NOW);

    expect(parsed.sessionPublicKey).toEqual(compressedKey());
    expect(parsed.allowPaths).toEqual(['vm/exec:gno.land/r/demo/counter']);
    expect(parsed.spendPeriod).toBe(0);
    expect(parsed.agentName).toBe('claude-code');
  });

  it('rejects the wildcard allow path', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), allow_paths: ['*'] }, NOW),
      'policy_violation',
    );
  });

  it('rejects empty allow paths', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), allow_paths: [] }, NOW),
      'invalid_params',
    );
  });

  it('requires ugnot in the spend limit', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), spend_limit: '100foo' }, NOW),
      'policy_violation',
    );
  });

  it('rejects a past or zero expiry', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), expires_at: 0 }, NOW),
      'policy_violation',
    );
  });

  it('rejects an expiry beyond the agent lifetime cap', () => {
    expectErrorCode(
      () =>
        parseCreateSessionParams(
          { ...validParams(), expires_at: NOW + AGENT_SESSION_MAX_LIFETIME_SECONDS + 1 },
          NOW,
        ),
      'policy_violation',
    );
  });

  it('rejects a fractional spend period', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), spend_period: 1.5 }, NOW),
      'invalid_params',
    );
  });
});

describe('parseRevokeSessionParams', () => {
  it('requires a session public key', () => {
    expectErrorCode(() => parseRevokeSessionParams({}), 'invalid_params');
  });
});

describe('normalizeAgentName', () => {
  it('falls back to "agent" for unusable names', () => {
    expect(normalizeAgentName(undefined)).toBe('agent');
    expect(normalizeAgentName('&&&')).toBe('agent');
  });

  it('strips characters that are unsafe in a hostname', () => {
    expect(normalizeAgentName('My Agent/v2?')).toBe('my-agent-v2');
  });
});

describe('toErrorResponse', () => {
  it('keeps the code of a request error', () => {
    expect(toErrorResponse('1', new AgentHostRequestError('rejected', 'no'))).toEqual({
      id: '1',
      error: { code: 'rejected', message: 'no' },
    });
  });

  it('maps unknown errors to internal_error', () => {
    expect(toErrorResponse('1', new Error('boom')).error?.code).toBe('internal_error');
  });
});
