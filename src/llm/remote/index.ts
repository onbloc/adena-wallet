// Public API of llm/remote: the hosted OpenAI model by API key (no React Native).
export { DEFAULT_REMOTE_CONTEXT_TOKENS, REMOTE_MODEL } from './config';
export type { RemoteLlmOptions } from './config';
export { createRemoteModel } from './createModel';
export { createLLMRemote } from './llmRemote';
