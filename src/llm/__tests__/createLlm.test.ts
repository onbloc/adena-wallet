import { createLLM } from '../device';

jest.mock('@react-native-ai/llama', () => ({ llama: { languageModel: jest.fn() } }));
jest.mock('../device/modelStorage', () => ({
  downloadModel: jest.fn(),
  isModelDownloaded: jest.fn(),
  removeModel: jest.fn(),
}));

describe('createLLM', () => {
  it('throws on a bad key instead of falling back to on-device', () => {
    expect(() => createLLM({ apiKey: '' })).toThrow('apiKey is empty');
  });
});
