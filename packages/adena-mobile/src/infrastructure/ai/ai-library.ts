/* eslint-disable @typescript-eslint/no-require-imports -- Install polyfills before SDK evaluation; load native inference only on request. */
// The AI SDK and web polyfills are loaded only when the assistant is used.
import type * as Agent from 'adena-ai-llm-poc';
import type * as Harness from 'adena-ai-llm-poc/harness';
import type * as Onbloc from 'adena-ai-llm-poc/harness/onbloc';
import type * as Llm from 'adena-ai-llm-poc/llm';
import type * as Device from 'adena-ai-llm-poc/llm/device';
import type * as Remote from 'adena-ai-llm-poc/llm/remote';

export interface AiLibrary {
  agent: typeof Agent;
  harness: typeof Harness;
  onbloc: typeof Onbloc;
  readonly device: typeof Device;
  llm: typeof Llm;
  remote: typeof Remote;
}

export type AiLibraryLoader = () => Promise<AiLibrary>;

let loading: Promise<AiLibrary> | undefined;

export const loadAiLibrary: AiLibraryLoader = () => {
  loading ??= Promise.resolve().then((): AiLibrary => {
    // Literal requires stay lazy in Metro and use the same CJS resolution in Jest.
    require('./polyfills');

    return {
      agent: require('adena-ai-llm-poc') as typeof Agent,
      harness: require('adena-ai-llm-poc/harness') as typeof Harness,
      onbloc: require('adena-ai-llm-poc/harness/onbloc') as typeof Onbloc,
      llm: require('adena-ai-llm-poc/llm') as typeof Llm,
      remote: require('adena-ai-llm-poc/llm/remote') as typeof Remote,
      get device(): typeof Device {
        return require('adena-ai-llm-poc/llm/device') as typeof Device;
      },
    };
  }).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });

  return loading;
};
