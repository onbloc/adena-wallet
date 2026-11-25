import { remoteOptionsFromEnv } from '../remoteEnv';

describe('remoteOptionsFromEnv', () => {
  it('is local (undefined) without SCENARIO_PROVIDER, even if a key is set', () => {
    expect(remoteOptionsFromEnv({})).toBeUndefined();
    expect(remoteOptionsFromEnv({ SCENARIO_PROVIDER: '  ', ANTHROPIC_API_KEY: 'k' })).toBeUndefined();
  });

  it("reads each provider's own key variable", () => {
    expect(remoteOptionsFromEnv({ SCENARIO_PROVIDER: 'anthropic', SCENARIO_MODEL: 'm', ANTHROPIC_API_KEY: 'a' })).toMatchObject({
      provider: 'anthropic',
      apiKey: 'a',
    });
    expect(remoteOptionsFromEnv({ SCENARIO_PROVIDER: 'openai', SCENARIO_MODEL: 'm', OPENAI_API_KEY: 'o' })).toMatchObject({
      provider: 'openai',
      apiKey: 'o',
    });
  });

  it('lets SCENARIO_API_KEY override the provider variable', () => {
    const env = { SCENARIO_PROVIDER: 'openai', SCENARIO_MODEL: 'm', OPENAI_API_KEY: 'o', SCENARIO_API_KEY: 's' };

    expect(remoteOptionsFromEnv(env)?.apiKey).toBe('s');
  });

  it('passes the optional base URL and context size', () => {
    const env = {
      SCENARIO_PROVIDER: 'openai-compatible',
      SCENARIO_MODEL: 'm',
      SCENARIO_API_KEY: 'k',
      SCENARIO_BASE_URL: 'https://proxy.test/v1',
      SCENARIO_CONTEXT_TOKENS: '32000',
    };

    expect(remoteOptionsFromEnv(env)).toEqual({
      provider: 'openai-compatible',
      model: 'm',
      apiKey: 'k',
      baseURL: 'https://proxy.test/v1',
      contextTokens: 32000,
    });
  });

  it('fails on a half-set remote, naming the missing variable but never the key', () => {
    expect(() => remoteOptionsFromEnv({ SCENARIO_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'secret' })).toThrow('SCENARIO_MODEL');
    const error = (() => {
      try {
        remoteOptionsFromEnv({ SCENARIO_PROVIDER: 'anthropic', SCENARIO_MODEL: 'm' });
      } catch (e) {
        return String(e);
      }
    })();
    expect(error).toContain('ANTHROPIC_API_KEY');
  });

  it('rejects an unknown provider and a bad context size', () => {
    expect(() => remoteOptionsFromEnv({ SCENARIO_PROVIDER: 'gemini' })).toThrow('SCENARIO_PROVIDER must be one of');
    const base = { SCENARIO_PROVIDER: 'anthropic', SCENARIO_MODEL: 'm', ANTHROPIC_API_KEY: 'k' };
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: 'big' })).toThrow('integer');
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: '0' })).toThrow('positive');
    expect(() => remoteOptionsFromEnv({ ...base, SCENARIO_CONTEXT_TOKENS: '-5' })).toThrow('positive');
  });
});
