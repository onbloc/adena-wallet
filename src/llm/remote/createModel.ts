import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { RemoteProvider, type RemoteProviderOptions } from './config';

/** The AI SDK model for a hosted provider. Throws on a missing key, model or required baseURL. */
export function createRemoteModel({ provider, apiKey, model, baseURL }: RemoteProviderOptions): LanguageModel {
  if (!apiKey.trim()) throw new Error(`Remote LLM (${provider}): apiKey is empty`);
  if (!model.trim()) throw new Error(`Remote LLM (${provider}): model is empty`);

  switch (provider) {
    case RemoteProvider.Anthropic:
      return createAnthropic({ apiKey, baseURL })(model);
    case RemoteProvider.OpenAI:
      // Responses API: the only one that serves the Codex models.
      return createOpenAI({ apiKey, baseURL })(model);
    case RemoteProvider.OpenAICompatible:
      if (!baseURL) throw new Error('Remote LLM (openai-compatible): baseURL is required');
      return createOpenAICompatible({ name: 'remote', apiKey, baseURL, includeUsage: true }).chatModel(model);
    default:
      throw new Error(`Unknown remote provider: ${String(provider)}`);
  }
}
