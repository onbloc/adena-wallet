import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { REMOTE_MODEL, type RemoteLlmOptions } from './config';

/** The AI SDK model for OpenAI (Responses API). Throws on an empty key. */
export function createRemoteModel({ apiKey, fetch }: RemoteLlmOptions): LanguageModel {
  if (!apiKey.trim()) throw new Error('Remote LLM: apiKey is empty');
  return createOpenAI({ apiKey, fetch })(REMOTE_MODEL);
}
