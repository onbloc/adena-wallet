import type { LLM } from '../core';
import { LLMOnDevice, type LLMOnDeviceOptions } from './llmOnDevice';
import { createLLMRemote, type RemoteLlmOptions } from '../remote';

export type LocalLLMOptions = { kind: 'local' } & LLMOnDeviceOptions;
export type RemoteLLMOptions = { kind: 'remote' } & RemoteLlmOptions;

/**
 * `local`: the on-device model (call `load()` before use). `remote`: the hosted OpenAI model, no
 * load step. An invalid `remote` throws; it never falls back to local.
 * Native entry only; browser consumers import createLLMRemote from llm/remote.
 */
export function createLLM(options: LocalLLMOptions): LLMOnDevice;
export function createLLM(options: RemoteLLMOptions): LLM;
export function createLLM(options: LocalLLMOptions | RemoteLLMOptions): LLM;
export function createLLM(options: LocalLLMOptions | RemoteLLMOptions): LLM {
  const { kind } = options;
  switch (options.kind) {
    case 'local':
      return new LLMOnDevice(options);
    case 'remote':
      return createLLMRemote(options);
    default:
      // Unreachable for typed callers; guards plain-JS callers.
      throw new TypeError(`Unknown LLM kind: ${String(kind)}`);
  }
}
