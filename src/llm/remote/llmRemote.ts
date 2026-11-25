import { LLMFromModel, type LLM } from '../core';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, type RemoteProviderOptions } from './config';
import { createRemoteModel } from './createModel';

/** An LLM served by a hosted provider (Anthropic, OpenAI, ...). No React Native needed. */
export function createLLMRemote(options: RemoteProviderOptions): LLM {
  return new LLMFromModel(createRemoteModel(options), {
    contextTokens: options.contextTokens ?? DEFAULT_REMOTE_CONTEXT_TOKENS,
  });
}
