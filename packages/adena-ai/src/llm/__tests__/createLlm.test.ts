import { LLMOnDevice, createLLM } from '../device';

jest.mock('@react-native-ai/llama', () => ({ llama: { languageModel: jest.fn() } }));
jest.mock('../device/modelStorage', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
}));

describe('createLLM', () => {
  it('builds the on-device model for kind local, with its options', () => {
    const llm = createLLM({ kind: 'local', contextParams: { n_ctx: 4096 } });

    expect(llm).toBeInstanceOf(LLMOnDevice);
    expect(llm.kind).toBe('local');
    expect(llm.contextTokens).toBe(4096);
  });

  it('builds the hosted model for kind remote, with its options', () => {
    const llm = createLLM({ kind: 'remote', apiKey: 'sk-test', contextTokens: 200_000 });

    expect(llm).not.toBeInstanceOf(LLMOnDevice);
    expect(llm.kind).toBe('remote');
    expect(llm.contextTokens).toBe(200_000);
  });

  it('throws on a bad key instead of falling back to on-device', () => {
    expect(() => createLLM({ kind: 'remote', apiKey: '' })).toThrow('apiKey is empty');
  });

  it('throws on an unknown kind from untyped callers', () => {
    expect(() => createLLM({ kind: 'cloud' } as never)).toThrow('Unknown LLM kind: cloud');
  });
});
