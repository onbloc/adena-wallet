import type { ContextParams } from '@react-native-ai/llama';

// Format: owner/repo/filename.gguf (Hugging Face).
export const DEFAULT_MODEL_ID =
  'bartowski/Qwen_Qwen3.5-2B-GGUF/Qwen_Qwen3.5-2B-Q4_K_M.gguf';

// Library default is 2048. The prompt with all wallet tools is ~1.3k tokens; the rest is room
// for tool results and multi-turn use. Keep the desktop llama-server `-c` in sync (with-server.sh).
export const DEFAULT_CONTEXT_PARAMS: Partial<ContextParams> = { n_ctx: 8192 };

// Output tokens must fit in the context window.
export const MAX_OUTPUT_TOKENS_RANGE = {
  min: 1,
  max: (DEFAULT_CONTEXT_PARAMS.n_ctx ?? 2048) - 1,
} as const;
