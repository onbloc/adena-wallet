import { wrapLanguageModel, type LanguageModel } from 'ai';

/**
 * Structured output on llama.rn goes wrong with a reasoning model such as Qwen3.5. With the Jinja
 * template path, the grammar is built for a sampler that has already read the generation prompt
 * (`<|im_start|>assistant\n<think>...`), but llama.rn registers it as a user grammar, which
 * llama.cpp never prefills. The grammar then asks the model to write `<|im_start|>assistant\n`
 * itself and allows an optional free-text `<think>` block before the JSON, which a small model
 * fills with long reasoning.
 *
 * Without the Jinja path llama.rn builds a plain JSON-schema grammar from the schema and sends no
 * generation prompt, so the first token must start the JSON. Only structured output uses it.
 */
export function withPlainJsonGrammar(model: Exclude<LanguageModel, string>) {
  return wrapLanguageModel({
    model,
    middleware: {
      specificationVersion: 'v4',
      transformParams: async ({ params }) =>
        params.responseFormat?.type === 'json'
          ? {
              ...params,
              providerOptions: {
                ...params.providerOptions,
                llama: { ...params.providerOptions?.llama, jinja: false },
              },
            }
          : params,
    },
  });
}
