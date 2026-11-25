import { createLLM } from '../createLlm';
import { LLMOnDevice } from '../device';
import { RemoteProvider } from '../remote';

jest.mock('@react-native-ai/llama', () => ({ downloadModel: jest.fn(), llama: { languageModel: jest.fn() } }));

describe('createLLM', () => {
  it('is on-device when no remote options are given', () => {
    expect(createLLM()).toBeInstanceOf(LLMOnDevice);
  });

  it('is the remote provider when options are given', () => {
    const llm = createLLM({ provider: RemoteProvider.Anthropic, apiKey: 'k', model: 'm', contextTokens: 1000 });

    expect(llm).not.toBeInstanceOf(LLMOnDevice);
    expect(llm.contextTokens).toBe(1000);
  });

  it('throws on a bad key instead of falling back to on-device', () => {
    expect(() => createLLM({ provider: RemoteProvider.OpenAI, apiKey: '', model: 'm' })).toThrow('apiKey is empty');
  });
});
