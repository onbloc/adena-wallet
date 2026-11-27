// Public API of llm/device: a model on this device (llama.rn). Needs React Native.
export { createLLM } from './createLlm';
export type { LocalLLMOptions, RemoteLLMOptions } from './createLlm';
export { DEFAULT_CONTEXT_PARAMS, DEFAULT_MODEL_ID, MAX_OUTPUT_TOKENS_RANGE } from './config';
export { LLMOnDevice } from './llmOnDevice';
export type { LLMOnDeviceOptions, RuntimeInfo } from './llmOnDevice';
export type { RuntimeStatus } from './runtime';
export { useLlm } from './useLlm';
export type { GenerationSource, RunState } from './useLlm';
