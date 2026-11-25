export const RemoteProvider = {
  Anthropic: 'anthropic',
  OpenAI: 'openai',
  /** Any OpenAI chat-completions server (vLLM, llama-server, a proxy); needs `baseURL`. */
  OpenAICompatible: 'openai-compatible',
} as const;
export type RemoteProvider = (typeof RemoteProvider)[keyof typeof RemoteProvider];

export type RemoteProviderOptions = {
  provider: RemoteProvider;
  /** Sent as a header (x-api-key / Bearer), never in the URL. */
  apiKey: string;
  /** e.g. 'claude-sonnet-4-5', 'gpt-5-codex'. */
  model: string;
  /** Overrides the provider's default endpoint, e.g. a backend proxy. Required for 'openai-compatible'. */
  baseURL?: string;
  /** Context window of `model`, in tokens. */
  contextTokens?: number;
};

// Conservative default; hosted models are far above the on-device 8192.
export const DEFAULT_REMOTE_CONTEXT_TOKENS = 128_000;
