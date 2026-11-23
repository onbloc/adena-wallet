import type { ContextParams } from '@react-native-ai/llama';

// Format: owner/repo/filename.gguf (Hugging Face).
export const DEFAULT_MODEL_ID =
  'bartowski/Qwen_Qwen3.5-2B-GGUF/Qwen_Qwen3.5-2B-Q4_K_M.gguf';

// Library default is 2048; raised so prompts + reasoning fit.
export const DEFAULT_CONTEXT_PARAMS: Partial<ContextParams> = { n_ctx: 4096 };

export const DEFAULT_GENERATE_SETTINGS = {
  temperature: 0.7,
  maxOutputTokens: 512,
  reasoning: 'none' as 'none' | 'provider-default',
};

// Bounds for UI input; output tokens must fit in the context window.
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const;
export const MAX_OUTPUT_TOKENS_RANGE = {
  min: 1,
  max: (DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048) - 1,
} as const;
