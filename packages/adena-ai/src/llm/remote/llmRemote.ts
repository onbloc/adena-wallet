import { LLMFromModel, resolveContextTokens, type LLM } from '../core';
import { resolveOpenAIModel } from './catalog';
import { DEFAULT_REMOTE_CONTEXT_TOKENS, DEFAULT_REMOTE_MODEL, type RemoteLlmOptions } from './config';
import { createRemoteModel } from './createModel';

/** An LLM served by OpenAI. No React Native needed. */
export function createLLMRemote(options: RemoteLlmOptions): LLM {
  const model = createRemoteModel(options);
  const { contextWindow } = resolveOpenAIModel(options.model ?? DEFAULT_REMOTE_MODEL);
  return new LLMFromModel(model, {
    kind: 'remote',
    contextTokens: resolveContextTokens(options.contextTokens ?? Math.min(contextWindow, DEFAULT_REMOTE_CONTEXT_TOKENS), contextWindow),
  });
}
