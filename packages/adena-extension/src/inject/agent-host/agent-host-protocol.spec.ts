import { toBase64 } from 'adena-module';

import {
  AGENT_SESSION_MAX_LIFETIME_SECONDS,
  AgentHostRequestError,
  agentSiteName,
  normalizeAgentName,
  parseAgentHostRequest,
  parseCancelParams,
  parseCreateSessionParams,
  parseRevokeSessionParams,
  parseSessionPublicKey,
  parseTransactionParams,
  spendPeriodsOf,
  toErrorResponse,
} from './agent-host-protocol';

const NOW = 1_800_000_000;
const MAX_SPEND = { maxSpendUgnot: BigInt(10_000_000), vmRunAllowed: false };
const WITH_VM_RUN = { ...MAX_SPEND, vmRunAllowed: true };

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
  }
  catch (error) {
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

  it('keeps a well-formed peer and drops malformed fields', () => {
    expect(
      parseAgentHostRequest({
        id: '1',
        method: 'ping',
        peer: { pid: 42, start: '17.5', exe: '/bin/adena-mcp' },
      }).peer,
    ).toEqual({ pid: 42, start: '17.5', exe: '/bin/adena-mcp' });
    expect(
      parseAgentHostRequest({ id: '1', method: 'ping', peer: { pid: -1, exe: 7 } }).peer,
    ).toEqual({});
  });

  it('keeps a connection token of sane length', () => {
    expect(parseAgentHostRequest({ id: '1', method: 'ping', token: 'abc' }).token).toBe('abc');
    expect(
      parseAgentHostRequest({ id: '1', method: 'ping', token: 'x'.repeat(257) }).token,
    ).toBeUndefined();
    expect(parseAgentHostRequest({ id: '1', method: 'ping', token: 7 }).token).toBeUndefined();
  });

  it('accepts cancel', () => {
    expect(parseAgentHostRequest({ id: 'c1', method: 'cancel' }).method).toBe('cancel');
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
    const parsed = parseCreateSessionParams(validParams(), NOW, MAX_SPEND);

    expect(parsed.sessionPublicKey).toEqual(compressedKey());
    expect(parsed.allowPaths).toEqual(['vm/exec:gno.land/r/demo/counter']);
    expect(parsed.spendPeriod).toBe(0);
    expect(parsed.agentName).toBe('claude-code');
  });

  it('rejects the wildcard allow path', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), allow_paths: ['*'] }, NOW, MAX_SPEND),
      'policy_violation',
    );
  });

  it('allows only single realms, bank/send and opted-in vm/run', () => {
    const allowed = (paths: unknown[], policy = MAX_SPEND): string[] =>
      parseCreateSessionParams({ ...validParams(), allow_paths: paths }, NOW, policy).allowPaths;

    expect(
      allowed([
        'vm/exec:gno.land/r/demo/counter',
        'vm/exec:gno.land/r/g1abc/app/v2',
        'bank/send',
        'bank/send',
      ]),
    ).toEqual(['vm/exec:gno.land/r/demo/counter', 'vm/exec:gno.land/r/g1abc/app/v2', 'bank/send']);
    expect(allowed(['vm/run'], WITH_VM_RUN)).toEqual(['vm/run']);

    for (const entry of [
      '*',
      'vm/exec',
      'vm/exec:',
      'vm/exec:gno.land',
      'vm/exec:gno.land/r',
      'vm/exec:gno.land/r/demo',
      'vm/exec:gno.land/r/demo/',
      'vm/exec:gno.land/p/demo/avl',
      'vm/exec:gno.land/r//counter',
      'vm/exec:gno.land/r/demo/*',
      'vm/exec:gno.land/r/demo/a b',
      'vm/run',
      'bank/multisend',
      'auth/create_session',
      'vm/add_package',
    ]) {
      expectErrorCode(() => allowed([entry]), 'policy_violation');
    }
  });

  it('caps the number of allow paths', () => {
    const paths = Array.from({ length: 17 }, (_, i) => `vm/exec:gno.land/r/demo/r${i}`);
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), allow_paths: paths }, NOW, MAX_SPEND),
      'policy_violation',
    );
  });

  it('rejects empty allow paths', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), allow_paths: [] }, NOW, MAX_SPEND),
      'invalid_params',
    );
  });

  it('accepts only a single positive ugnot amount', () => {
    for (const spendLimit of ['100foo', '100xugnot', '1ugnot,1foo', '0ugnot', 'ugnot', 100]) {
      expectErrorCode(
        () =>
          parseCreateSessionParams({ ...validParams(), spend_limit: spendLimit }, NOW, MAX_SPEND),
        'policy_violation',
      );
    }
    expect(
      parseCreateSessionParams({ ...validParams(), spend_limit: ' 007ugnot ' }, NOW, MAX_SPEND)
        .spendLimit,
    ).toBe('7ugnot');
  });

  it('caps the spend limit at the user maximum', () => {
    expect(
      parseCreateSessionParams({ ...validParams(), spend_limit: '10000000ugnot' }, NOW, MAX_SPEND)
        .spendLimit,
    ).toBe('10000000ugnot');
    expectErrorCode(
      () =>
        parseCreateSessionParams(
          { ...validParams(), spend_limit: '10000001ugnot' },
          NOW,
          MAX_SPEND,
        ),
      'policy_violation',
    );
  });

  it('rejects a past or zero expiry', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), expires_at: 0 }, NOW, MAX_SPEND),
      'policy_violation',
    );
  });

  it('rejects an expiry beyond the agent lifetime cap', () => {
    expectErrorCode(
      () =>
        parseCreateSessionParams(
          { ...validParams(), expires_at: NOW + AGENT_SESSION_MAX_LIFETIME_SECONDS + 1 },
          NOW,
          MAX_SPEND,
        ),
      'policy_violation',
    );
  });

  it('caps the total a resetting spend limit can reach over the lifetime', () => {
    // A 1s period resets every block, so the cap applies to the week's total.
    expectErrorCode(
      () =>
        parseCreateSessionParams(
          {
            ...validParams(),
            spend_limit: '10000000ugnot',
            spend_period: 1,
            expires_at: NOW + AGENT_SESSION_MAX_LIFETIME_SECONDS,
          },
          NOW,
          MAX_SPEND,
        ),
      'policy_violation',
    );

    // 1 GNOT every hour for 2 hours fits a 10 GNOT cap with the clock margin.
    expect(spendPeriodsOf(3600, 7200)).toBe(BigInt(3));
    expect(
      parseCreateSessionParams(
        { ...validParams(), spend_limit: '1000000ugnot', spend_period: 3600, expires_at: NOW + 7200 },
        NOW,
        MAX_SPEND,
      ).spendPeriod,
    ).toBe(3600);

    // 5 GNOT every hour for 2 hours does not.
    expectErrorCode(
      () =>
        parseCreateSessionParams(
          { ...validParams(), spend_limit: '5000000ugnot', spend_period: 3600, expires_at: NOW + 7200 },
          NOW,
          MAX_SPEND,
        ),
      'policy_violation',
    );

    // A period longer than the lifetime counts once.
    expect(spendPeriodsOf(7 * 24 * 3600, 3600)).toBe(BigInt(1));
    expect(spendPeriodsOf(0, 3600)).toBe(BigInt(1));
  });

  it('explains the total in a periodic spend violation', () => {
    try {
      parseCreateSessionParams(
        { ...validParams(), spend_limit: '1000ugnot', spend_period: 1, expires_at: NOW + 3600 },
        NOW,
        { ...MAX_SPEND, maxSpendUgnot: BigInt(100_000) },
      );
    }
    catch (error) {
      const message = (error as Error).message;
      expect(message).toContain('3901 times');
      expect(message).toContain('3901000ugnot in total');
      expect(message).toContain('100000ugnot');
      expect(message).toContain('spend_period 0');
      return;
    }
    throw new Error('expected a policy violation');
  });

  it('rejects a fractional spend period', () => {
    expectErrorCode(
      () => parseCreateSessionParams({ ...validParams(), spend_period: 1.5 }, NOW, MAX_SPEND),
      'invalid_params',
    );
  });
});

describe('parseCancelParams', () => {
  it('requires the id of the request to cancel', () => {
    expect(parseCancelParams({ request_id: '7' })).toBe('7');
    expectErrorCode(() => parseCancelParams({}), 'invalid_params');
  });
});

describe('parseRevokeSessionParams', () => {
  it('requires a session public key', () => {
    expectErrorCode(() => parseRevokeSessionParams({}), 'invalid_params');
  });

  it('keeps the expected master and chain', () => {
    const parsed = parseRevokeSessionParams({
      session_public_key: toBase64(compressedKey()),
      master_address: 'g1master',
      chain_id: 'test11',
    });
    expect(parsed.masterAddress).toBe('g1master');
    expect(parsed.chainId).toBe('test11');

    expectErrorCode(
      () =>
        parseRevokeSessionParams({ session_public_key: toBase64(compressedKey()), chain_id: 7 }),
      'invalid_params',
    );
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

describe('parseTransactionParams', () => {
  const ADDRESS = 'g1jg8mtutu9khhfwc4nxmuhcpftf0pajdhfvsqf5';

  it('fills signer fields and defaults for every supported type', () => {
    const parsed = parseTransactionParams(
      {
        messages: [
          { type: '/vm.m_call', value: { pkg_path: 'gno.land/r/demo/counter', func: 'Incr' } },
          {
            type: '/vm.m_run',
            value: { package: { name: 'main', path: '', files: [{ name: 'main.gno', body: '' }] } },
          },
          {
            type: '/vm.m_addpkg',
            value: { package: { name: 'foo', path: 'gno.land/p/demo/foo', files: [] } },
          },
          { type: '/bank.MsgSend', value: { to_address: ADDRESS, amount: '1ugnot' } },
        ],
        memo: 'hello',
        gas_wanted: 100000,
      },
      ADDRESS,
    );

    expect(
      parsed.messages.map(m => m.value.caller ?? m.value.creator ?? m.value.from_address),
    ).toEqual([ADDRESS, ADDRESS, ADDRESS, ADDRESS]);
    expect(parsed.messages[0].value.args).toEqual([]);
    expect(parsed.messages[0].value.send).toBe('');
    expect(parsed.memo).toBe('hello');
    expect(parsed.gasWanted).toBe(100000);
    expect(parsed.gasFee).toBeUndefined();
  });

  it('rejects a signer field naming another account', () => {
    expectErrorCode(
      () =>
        parseTransactionParams(
          {
            messages: [
              {
                type: '/bank.MsgSend',
                value: { from_address: 'g1other', to_address: ADDRESS, amount: '1ugnot' },
              },
            ],
          },
          ADDRESS,
        ),
      'invalid_params',
    );
  });

  it('rejects session admin and unknown message types', () => {
    for (const type of ['/auth.m_create_session', '/bank.MsgMultiSend']) {
      expectErrorCode(
        () => parseTransactionParams({ messages: [{ type, value: {} }] }, ADDRESS),
        'invalid_params',
      );
    }
  });

  it('rejects empty and malformed message lists', () => {
    expectErrorCode(() => parseTransactionParams({ messages: [] }, ADDRESS), 'invalid_params');
    expectErrorCode(
      () =>
        parseTransactionParams(
          { messages: [{ type: '/vm.m_call', value: { func: 'F' } }] },
          ADDRESS,
        ),
      'invalid_params',
    );
    expectErrorCode(
      () =>
        parseTransactionParams(
          {
            messages: [{ type: '/bank.MsgSend', value: { to_address: ADDRESS, amount: '1ugnot' } }],
            gas_fee: -1,
          },
          ADDRESS,
        ),
      'invalid_params',
    );
  });
});

describe('agentSiteName', () => {
  it('matches the connected-sites key the establish popup stores', () => {
    expect(agentSiteName('claude-code')).toBe('agent://claude-code.agent');
  });
});
