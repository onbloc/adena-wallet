import { createLLM } from '../device';
import { RemoteProvider } from '../remote';

jest.mock('@react-native-ai/llama', () => ({ downloadModel: jest.fn(), llama: { languageModel: jest.fn() } }));

describe('createLLM', () => {
  it('throws on a bad key instead of falling back to on-device', () => {
    expect(() => createLLM({ provider: RemoteProvider.OpenAI, apiKey: '', model: 'm' })).toThrow('apiKey is empty');
  });
});
