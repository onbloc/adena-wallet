import type { LLM } from '../core';
import { LLMOnDevice } from './llmOnDevice';
import { createLLMRemote, type RemoteProviderOptions } from '../remote';

/**
 * No `remote`: the on-device model (call `load()` before use). With `remote`: that hosted
 * provider, no load step. An invalid `remote` throws; it never falls back to local.
 * Native entry only; browser consumers use createLLMRemote from llm/remote.
 */
export function createLLM(): LLMOnDevice;
export function createLLM(remote: RemoteProviderOptions): LLM;
export function createLLM(remote?: RemoteProviderOptions): LLM {
  return remote ? createLLMRemote(remote) : new LLMOnDevice();
}
