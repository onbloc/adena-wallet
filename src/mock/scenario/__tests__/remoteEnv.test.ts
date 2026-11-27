import { remoteOptionsFromEnv } from '../remoteEnv';

describe('remoteOptionsFromEnv', () => {
  it('is local (undefined) without SCENARIO_REMOTE, even if a key is set', () => {
    expect(remoteOptionsFromEnv({})).toBeUndefined();
    expect(remoteOptionsFromEnv({ SCENARIO_REMOTE: '  ', OPENAI_API_KEY: 'k' })).toBeUndefined();
  });

  it('reads the key from OPENAI_API_KEY and the optional context size', () => {
    expect(remoteOptionsFromEnv({ SCENARIO_REMOTE: '1', OPENAI_API_KEY: 'o' })).toEqual({ apiKey: 'o', contextTokens: undefined });
    expect(remoteOptionsFromEnv({ SCENARIO_REMOTE: '1', OPENAI_API_KEY: 'o', SCENARIO_CONTEXT_TOKENS: '32000' })).toEqual({
      apiKey: 'o',
      contextTokens: 32000,
    });
  });

  it('fails without a key, naming the variable', () => {
    expect(() => remoteOptionsFromEnv({ SCENARIO_REMOTE: '1' })).toThrow('OPENAI_API_KEY');
  });

  it('rejects a bad context size without leaking the key', () => {
    const base = { SCENARIO_REMOTE: '1', OPENAI_API_KEY: 'secret' };
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: 'big' })).toThrow('integer');
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: '0' })).toThrow('positive');
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: '-5' })).toThrow('positive');
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: 'big' })).not.toThrow('secret');
  });
});
