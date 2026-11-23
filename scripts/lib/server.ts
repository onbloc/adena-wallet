import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

export const DEFAULT_SERVER_URL = 'http://127.0.0.1:8089/v1';
export const DEFAULT_MODEL_NAME = 'qwen';

/** Checks that the OpenAI-compatible server (llama-server) answers, then returns its model. */
export async function connectModel(url: string, modelName: string): Promise<LanguageModel> {
  const baseURL = url.replace(/\/$/, '');
  try {
    const response = await fetch(`${baseURL}/models`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Cannot reach the model server at ${baseURL} (${String(error)}). ` +
        'Start llama-server first (make eval and make chat start one for you).'
    );
  }
  return createOpenAICompatible({ name: 'llama-server', baseURL, includeUsage: true }).chatModel(modelName);
}
