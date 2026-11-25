import { createOpenAI } from '@ai-sdk/openai';
import { wrapLanguageModel, type LanguageModel } from 'ai';
import { REMOTE_MODEL, type RemoteLlmOptions } from './config';

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

/** The AI SDK model for OpenAI (Responses API). Throws on an empty key. */
export function createRemoteModel({ apiKey, fetch }: RemoteLlmOptions): LanguageModel {
  if (!apiKey.trim()) throw new Error('Remote LLM: apiKey is empty');
  return wrapLanguageModel({
    model: createOpenAI({ apiKey, fetch })(REMOTE_MODEL),
    middleware: {
      specificationVersion: 'v4',
      // Only these two change; the rest of the params (prompt, abort signal) pass through untouched.
      transformParams: async ({ params: { responseFormat, tools, ...params } }) => ({
        ...params,
        // The agent's output schemas are unions at the root (`oneOf`, no `type: object`), which OpenAI's
        // strict json_schema refuses. Ask for plain JSON instead: the prompts describe the shape and the
        // answer is validated against the zod schema client-side.
        responseFormat: responseFormat?.type === 'json' ? { type: 'json' as const } : responseFormat,
        tools: tools?.map((tool) => (tool.type === 'function' ? { ...tool, inputSchema: withoutUnicodePatterns(tool.inputSchema) } : tool)),
      }),
    },
  });
}
