/** The model used when `RemoteLlmOptions.model` is not set. */
export const DEFAULT_REMOTE_MODEL = 'gpt-6-luna';

export type RemoteLlmOptions = {
  /** Sent as a Bearer header, never in the URL. */
  apiKey: string;
  /** An OpenAI model, alias or snapshot ID from openaiModels.json; unlisted IDs throw. Default `DEFAULT_REMOTE_MODEL`. */
  model?: string;
  /** Context window to use, in tokens: at most the model's own. Default: the model's, capped at `DEFAULT_REMOTE_CONTEXT_TOKENS`. */
  contextTokens?: number;
  /** Custom fetch; React Native needs a streaming one (expo/fetch), its global fetch cannot stream. */
  fetch?: typeof fetch;
};

// Conservative default; hosted models are far above the on-device 8192, but a full window costs money.
export const DEFAULT_REMOTE_CONTEXT_TOKENS = 128_000;
