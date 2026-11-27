import catalogFile from '../openaiModels.json';
import { OPENAI_MODELS, resolveOpenAIModel } from '../catalog';
import { DEFAULT_REMOTE_MODEL } from '../config';

const EFFORT_ORDER = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];

describe('openaiModels.json', () => {
  it('lists every ID, alias and snapshot once, across supported, unsupported and excluded models', () => {
    const ids = [
      ...OPENAI_MODELS.flatMap(({ id, aliases, snapshots }) => [id, ...aliases, ...snapshots]),
      ...catalogFile.unsupported.map(({ id }) => id),
      ...catalogFile.excluded.flatMap(({ ids }) => ids),
    ];

    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([]);
  });

  it('holds only models that can run the agent, and the default among them', () => {
    for (const { id, features } of OPENAI_MODELS) {
      expect({ id, ...features, imageInput: undefined }).toEqual({ id, streaming: true, structuredOutputs: true, functionCalling: true, imageInput: undefined });
    }
    expect(OPENAI_MODELS.map(({ id }) => id)).toContain(DEFAULT_REMOTE_MODEL);
  });

  it.each(OPENAI_MODELS)('$id has limits and efforts the API can accept', model => {
    expect(model.contextWindow).toBeGreaterThan(0);
    expect(model.maxOutputTokens).toBeGreaterThan(0);
    expect(model.maxOutputTokens).toBeLessThanOrEqual(model.contextWindow);
    if (model.maxInputTokens !== undefined) expect(model.maxInputTokens).toBeLessThanOrEqual(model.contextWindow);

    const { supported, efforts, default: fallback } = model.reasoning;
    expect(efforts.length > 0).toBe(supported);
    expect(efforts).toEqual(EFFORT_ORDER.filter(effort => efforts.includes(effort as never)));
    if (fallback !== null) expect(efforts).toContain(fallback);

    expect(model.status === 'deprecated').toBe(typeof model.shutdownDate === 'string');
    if (model.shutdownDate) expect(model.shutdownDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('resolveOpenAIModel', () => {
  it('finds a model by ID, alias or snapshot', () => {
    expect(resolveOpenAIModel('gpt-5.6-sol').id).toBe('gpt-5.6-sol');
    expect(resolveOpenAIModel('gpt-5.6').id).toBe('gpt-5.6-sol');
    expect(resolveOpenAIModel('gpt-5.4-2026-03-05').id).toBe('gpt-5.4');
  });

  it('explains why OpenAI models that cannot run the agent are refused', () => {
    expect(() => resolveOpenAIModel('o3-pro')).toThrow('no streaming');
    expect(() => resolveOpenAIModel('text-embedding-3-small')).toThrow('Embedding models');
    expect(() => resolveOpenAIModel('gpt-4-turbo')).toThrow('Shut down');
  });

  it('refuses an unknown ID', () => {
    expect(() => resolveOpenAIModel('gpt-9')).toThrow(TypeError);
  });
});
