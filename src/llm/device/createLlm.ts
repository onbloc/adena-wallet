import type { LLM } from '../core';
import { LLMOnDevice } from './llmOnDevice';
import { createLLMRemote, type RemoteLlmOptions } from '../remote';

/**
 * No `remote`: the on-device model (call `load()` before use). With `remote`: the hosted OpenAI
 * model, no load step. An invalid `remote` throws; it never falls back to local.
 * Native entry only; browser consumers import createLLMRemote from llm/remote.
 */
export function createLLM(): LLMOnDevice;
export function createLLM(remote: RemoteLlmOptions): LLM;
export function createLLM(remote?: RemoteLlmOptions): LLM {
  return remote ? createLLMRemote(remote) : new LLMOnDevice();
}
