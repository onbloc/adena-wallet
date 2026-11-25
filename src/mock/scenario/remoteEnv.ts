import type { RemoteLlmOptions } from '../../llm/remote';

type Env = Record<string, string | undefined>;

/**
 * The hosted OpenAI model the scenarios should run on: SCENARIO_REMOTE set, the key in OPENAI_API_KEY,
 * and an optional SCENARIO_CONTEXT_TOKENS. No SCENARIO_REMOTE: undefined (the local server), even
 * if a key is set. Throws on a half-set remote; the message never contains the key.
 */
export function remoteOptionsFromEnv(env: Env): RemoteLlmOptions | undefined {
  const get = (name: string) => env[name]?.trim() || undefined;
  if (get('SCENARIO_REMOTE') === undefined) return undefined;

  const apiKey = get('OPENAI_API_KEY');
  if (!apiKey) throw new Error('Set OPENAI_API_KEY for the remote scenarios.');

  const rawContext = get('SCENARIO_CONTEXT_TOKENS');
  const contextTokens = rawContext === undefined ? undefined : Number(rawContext);
  if (contextTokens !== undefined && !Number.isSafeInteger(contextTokens)) {
    throw new Error(`SCENARIO_CONTEXT_TOKENS must be an integer (got "${rawContext}").`);
  }
  if (contextTokens !== undefined && contextTokens <= 0) {
    throw new Error(`SCENARIO_CONTEXT_TOKENS must be positive (got "${rawContext}").`);
  }

  return { apiKey, contextTokens };
}
