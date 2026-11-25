/** The only hosted model: OpenAI, fixed. The user supplies just the API key. */
export const REMOTE_MODEL = 'gpt-6-luna';

export type RemoteLlmOptions = {
  /** Sent as a Bearer header, never in the URL. */
  apiKey: string;
  /** Context window of `REMOTE_MODEL`, in tokens. */
  contextTokens?: number;
  /** Custom fetch; React Native needs a streaming one (expo/fetch), its global fetch cannot stream. */
  fetch?: typeof fetch;
};

// Conservative default; hosted models are far above the on-device 8192.
export const DEFAULT_REMOTE_CONTEXT_TOKENS = 128_000;
