import { RemoteProvider, type RemoteProviderOptions } from '../../llm/remote';

// The provider's own variable is the usual place for its key; SCENARIO_API_KEY overrides it.
const KEY_VARS: Record<RemoteProvider, string> = {
  [RemoteProvider.Anthropic]: 'ANTHROPIC_API_KEY',
  [RemoteProvider.OpenAI]: 'OPENAI_API_KEY',
  [RemoteProvider.OpenAICompatible]: 'SCENARIO_API_KEY',
};

type Env = Record<string, string | undefined>;

/**
 * The hosted model the scenarios should run on, from SCENARIO_PROVIDER / SCENARIO_MODEL /
 * SCENARIO_BASE_URL / SCENARIO_CONTEXT_TOKENS and the key variable. No SCENARIO_PROVIDER: undefined
 * (the local server). Throws on a half-set remote; the message never contains the key.
 */
export function remoteOptionsFromEnv(env: Env): RemoteProviderOptions | undefined {
  const get = (name: string) => env[name]?.trim() || undefined;
  const provider = get('SCENARIO_PROVIDER');
  if (provider === undefined) return undefined;

  if (!Object.values<string>(RemoteProvider).includes(provider)) {
    throw new Error(`SCENARIO_PROVIDER must be one of ${Object.values(RemoteProvider).join(', ')} (got "${provider}").`);
  }
  const known = provider as RemoteProvider;
  const model = get('SCENARIO_MODEL');
  if (!model) throw new Error('Set SCENARIO_MODEL for the remote scenarios.');
  const keyVar = KEY_VARS[known];
  const apiKey = get('SCENARIO_API_KEY') ?? get(keyVar);
  if (!apiKey) throw new Error(`Set ${keyVar} (or SCENARIO_API_KEY) for the remote scenarios.`);

  const rawContext = get('SCENARIO_CONTEXT_TOKENS');
  const contextTokens = rawContext === undefined ? undefined : Number(rawContext);
  if (contextTokens !== undefined && !Number.isSafeInteger(contextTokens)) {
    throw new Error(`SCENARIO_CONTEXT_TOKENS must be an integer (got "${rawContext}").`);
  }
  if (contextTokens !== undefined && contextTokens <= 0) {
    throw new Error(`SCENARIO_CONTEXT_TOKENS must be positive (got "${rawContext}").`);
  }

  return { provider: known, apiKey, model, baseURL: get('SCENARIO_BASE_URL'), contextTokens };
}
