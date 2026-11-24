import { simulateStreamingMiddleware, wrapLanguageModel, type LanguageModel } from 'ai';

/**
 * Native llama callbacks can publish tool IDs before their argument JSON is complete: wrap the
 * model so a step is completed before its tool calls are streamed. Use it when tools are on;
 * it makes text arrive in one piece.
 */
export function withCompletedToolCalls(model: Exclude<LanguageModel, string>) {
  return wrapLanguageModel({ model, middleware: simulateStreamingMiddleware() });
}
