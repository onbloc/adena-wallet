import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel, type LanguageModel } from 'ai';
import { resolveOpenAIModel } from './catalog';
import { DEFAULT_REMOTE_MODEL, type RemoteLlmOptions } from './config';
import { fitCallToModel } from './modelParams';

// OpenAI rejects a tool-schema `pattern` with Unicode property escapes (\p{L}) as "not a regex".
// Like the SDK does for lookaround, drop it: the zod schema still validates the arguments client-side.
const UNICODE_PROPERTY = /\\[pP]\{/;

function withoutUnicodePatterns<T>(node: T): T {
  if (Array.isArray(node)) return node.map(withoutUnicodePatterns) as T;
  if (typeof node !== 'object' || node === null) return node;
  return Object.fromEntries(
    Object.entries(node)
      .filter(([key, value]) => !(key === 'pattern' && typeof value === 'string' && UNICODE_PROPERTY.test(value)))
      .map(([key, value]) => [key, withoutUnicodePatterns(value)])
  ) as T;
}

/**
 * The AI SDK model for an OpenAI model of openaiModels.json (Responses API). Throws on an empty
 * key, and on a model that is unlisted or that the agent cannot run on.
 */
export function createRemoteModel({ apiKey, model: modelId = DEFAULT_REMOTE_MODEL, fetch }: RemoteLlmOptions): LanguageModel {
  if (!apiKey.trim()) throw new Error('Remote LLM: apiKey is empty');
  const catalogEntry = resolveOpenAIModel(modelId);
  return wrapLanguageModel({
    model: createOpenAI({ apiKey, fetch })(modelId),
    middleware: {
      specificationVersion: 'v4',
      transformParams: async ({ params: { responseFormat, tools, ...params } }) => {
        const schema = responseFormat?.type === 'json' ? responseFormat.schema : undefined;
        // OpenAI forbids root unions. Keep object schemas strict; only unions need JSON mode.
        const rootUnion = schema?.oneOf !== undefined || schema?.anyOf !== undefined;
        const fit = fitCallToModel(catalogEntry, params);
        return {
          ...params,
          reasoning: fit.reasoning,
          ...(!fit.sampling && { temperature: undefined, topP: undefined }),
          // The SDK knows only the models of its own table; the rest would run without an effort.
          ...(fit.forceReasoning && {
            providerOptions: { ...params.providerOptions, openai: { ...params.providerOptions?.openai, forceReasoning: true } },
          }),
          ...(rootUnion && {
            prompt: [
              ...params.prompt,
              {
                role: 'system' as const,
                content: `Return only a JSON object matching this JSON Schema, with no markdown or surrounding text:\n${JSON.stringify(schema)}`,
              },
            ],
          }),
          responseFormat: rootUnion ? { type: 'json' as const } : responseFormat,
          tools: tools?.map((tool) => (tool.type === 'function' ? { ...tool, inputSchema: withoutUnicodePatterns(tool.inputSchema) } : tool)),
        };
      },
    },
  });
}
