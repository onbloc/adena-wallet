import { RemoteProvider, type RemoteProviderOptions } from '../../llm/remote';

/** Where the model runs: this device, or a hosted provider. */
export type LlmSource = 'device' | RemoteProvider;

export const LLM_SOURCES: readonly LlmSource[] = ['device', ...Object.values(RemoteProvider)];

export type LlmSettings = {
  /** The options to build the hosted LLM; null for the on-device model or while a field is invalid. */
  remote: RemoteProviderOptions | null;
  modelError: string | null;
  keyError: string | null;
  baseUrlError: string | null;
};

const LOOPBACK_HOSTS: Record<string, true> = { localhost: true, '127.0.0.1': true, '[::1]': true };

/** The key travels to this URL, so it must be https (loopback http only for a local dev server). */
function baseUrlError(raw: string, allowLoopbackHttp?: true): string | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'Must be a URL.';
  }
  if (url.username || url.password) return 'Must not contain credentials.';
  if (url.protocol === 'https:') return null;
  if (url.protocol === 'http:' && allowLoopbackHttp && LOOPBACK_HOSTS[url.hostname] === true) return null;
  return 'Must be https.';
}

/**
 * Validates the raw Settings inputs of a hosted model. On-device needs none. An empty Base URL
 * means the provider's own endpoint, except for 'openai-compatible', which has none.
 */
export function resolveLlmSettings(
  source: LlmSource,
  rawModel: string,
  rawApiKey: string,
  rawBaseUrl: string,
  { fetch, allowLoopbackHttp }: { fetch?: typeof globalThis.fetch; allowLoopbackHttp?: true } = {}
): LlmSettings {
  if (source === 'device') return { remote: null, modelError: null, keyError: null, baseUrlError: null };

  const model = rawModel.trim();
  const apiKey = rawApiKey.trim();
  const baseURL = rawBaseUrl.trim();
  const modelError = model === '' ? 'Required.' : null;
  const keyError = apiKey === '' ? 'Required.' : null;
  const urlError =
    baseURL !== ''
      ? baseUrlError(baseURL, allowLoopbackHttp)
      : source === RemoteProvider.OpenAICompatible
        ? 'Required.'
        : null;

  const valid = modelError === null && keyError === null && urlError === null;
  return {
    remote: valid ? { provider: source, model, apiKey, baseURL: baseURL || undefined, fetch } : null,
    modelError,
    keyError,
    baseUrlError: urlError,
  };
}
