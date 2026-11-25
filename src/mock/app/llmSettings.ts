import type { RemoteLlmOptions } from '../../llm/remote';

/** Where the model runs: this device, or the hosted OpenAI model. */
export type LlmSource = 'device' | 'openai';

export const LLM_SOURCES: readonly LlmSource[] = ['device', 'openai'];

export type LlmSettings = {
  /** The options to build the hosted LLM; null for the on-device model or while the key is empty. */
  remote: RemoteLlmOptions | null;
  keyError: string | null;
};

/** Validates the raw API key of the hosted model. On-device needs none. */
export function resolveLlmSettings(
  source: LlmSource,
  rawApiKey: string,
  { fetch }: { fetch?: typeof globalThis.fetch } = {}
): LlmSettings {
  if (source === 'device') return { remote: null, keyError: null };

  const apiKey = rawApiKey.trim();
  return apiKey === '' ? { remote: null, keyError: 'Required.' } : { remote: { apiKey, fetch }, keyError: null };
}
