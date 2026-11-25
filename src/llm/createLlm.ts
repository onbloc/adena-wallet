import type { LLM } from './core';
import { LLMOnDevice } from './device';
import { createLLMRemote, type RemoteLlmOptions } from './remote';

/**
 * No `remote`: the on-device model (call `load()` before use). With `remote`: the hosted OpenAI
 * model, no load step. An invalid `remote` throws; it never falls back to local.
 * Needs React Native (it can build the on-device model); remote-only code imports `llm/remote`.
 */
export function createLLM(): LLMOnDevice;
export function createLLM(remote: RemoteLlmOptions): LLM;
export function createLLM(remote?: RemoteLlmOptions): LLM {
  return remote ? createLLMRemote(remote) : new LLMOnDevice();
}
