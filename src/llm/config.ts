import type { ContextParams } from '@react-native-ai/llama';

// Format: owner/repo/filename.gguf (Hugging Face).
export const DEFAULT_MODEL_ID =
  'bartowski/Qwen_Qwen3.5-2B-GGUF/Qwen_Qwen3.5-2B-Q4_K_M.gguf';

// Library default is 2048. The prompt with all wallet tools is ~1.3k tokens; the rest is room
// for tool results and multi-turn use. Keep the desktop llama-server `-c` in sync (with-server.sh).
export const DEFAULT_CONTEXT_PARAMS: Partial<ContextParams> = { n_ctx: 8192 };

// Low temperature: tool calls need stable names and arguments.
export const DEFAULT_GENERATE_SETTINGS = {
  temperature: 0.2,
  maxOutputTokens: 512,
  reasoning: 'none' as 'none' | 'provider-default',
};

// Max model calls per run with wallet tools (e.g. a balance read -> transfer -> answer).
export const MAX_STEPS = 5;

// Bounds for UI input; output tokens must fit in the context window.
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const;
export const MAX_OUTPUT_TOKENS_RANGE = {
  min: 1,
  max: (DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048) - 1,
} as const;
