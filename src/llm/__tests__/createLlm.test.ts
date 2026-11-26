import { createLLM } from '../createLlm';
import { LLMOnDevice } from '../device';

jest.mock('@react-native-ai/llama', () => ({ llama: { languageModel: jest.fn() } }));
jest.mock('../device/modelStorage', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
}));

describe('createLLM', () => {
  it('is on-device when no remote options are given', () => {
    expect(createLLM()).toBeInstanceOf(LLMOnDevice);
  });

  it('is the remote provider when options are given', () => {
    const llm = createLLM({ apiKey: 'k', contextTokens: 1000 });

    expect(llm).not.toBeInstanceOf(LLMOnDevice);
    expect(llm.contextTokens).toBe(1000);
  });

  it('throws on a bad key instead of falling back to on-device', () => {
    expect(() => createLLM({ apiKey: '' })).toThrow('apiKey is empty');
  });
});
