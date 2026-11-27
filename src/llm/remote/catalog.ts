import catalogFile from './openaiModels.json';

export type ReasoningEffort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

/** One OpenAI model the agent can run on, as listed in openaiModels.json. */
export type OpenAIModel = {
  id: string;
  name: string;
  /** `deprecated` models still answer until `shutdownDate`. */
  status: 'active' | 'deprecated';
  shutdownDate?: string | null;
  /** `restricted` models need an approved organization. */
  access: 'public' | 'restricted';
  contextWindow: number;
  maxInputTokens?: number;
  maxOutputTokens: number;
  /** Other IDs that route to this model. */
  aliases: string[];
  /** Dated IDs that pin this model's version. */
  snapshots: string[];
  reasoning: {
    supported: boolean;
    /** Lowest to highest; the API rejects any other value. */
    efforts: ReasoningEffort[];
    /** The effort the API uses when none is sent; null when the docs do not say. */
    default: ReasoningEffort | null;
  };
  features: { streaming: boolean; structuredOutputs: boolean; functionCalling: boolean; imageInput: boolean };
};

type Catalog = {
  models: OpenAIModel[];
  unsupported: { id: string; reason: string }[];
  excluded: { reason: string; ids: string[] }[];
};

// The JSON file is the documented source of truth; catalog.test.ts checks its shape.
const catalog = catalogFile as Catalog;

export const OPENAI_MODELS: readonly OpenAIModel[] = catalog.models;

const supported = new Map<string, OpenAIModel>();
for (const model of OPENAI_MODELS) {
  for (const id of [model.id, ...model.aliases, ...model.snapshots]) supported.set(id, model);
}
const refused = new Map<string, string>([
  ...catalog.unsupported.map(({ id, reason }) => [id, reason] as const),
  ...catalog.excluded.flatMap(({ reason, ids }) => ids.map(id => [id, reason] as const)),
]);

/**
 * The catalog entry for a model ID, alias or snapshot.
 * Throws TypeError for a model the agent cannot run on, with the reason when OpenAI lists it.
 */
export function resolveOpenAIModel(id: string): OpenAIModel {
  const model = supported.get(id);
  if (model) return model;
  const reason = refused.get(id);
  if (reason) throw new TypeError(`OpenAI model "${id}" is not supported: ${reason}`);
  throw new TypeError(`Unknown OpenAI model "${id}". Supported: ${OPENAI_MODELS.map(({ id: known }) => known).join(', ')}.`);
}
