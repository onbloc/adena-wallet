import { z } from 'zod';
import type { Decision, HarnessRun } from '../harness/core';
import type { GenerateEvent } from '../llm/core';

const data = <T extends z.ZodType>(schema: T) => z.object({ kind: z.literal('result'), value: z.object({ untrustedData: schema }) });
const location = z.object({ name: z.string(), signature: z.string(), filename: z.string(), line: z.number().int().positive() });
const index = z.object({ path: z.string(), functions: z.array(location.partial({ filename: true, line: true })), sourceFiles: z.array(z.string()).optional() });
const file = z.object({ path: z.string(), filename: z.string(), content: z.string() });
const failure = 'The function implementation could not be verified from the indexed source.';

export interface RealmEvidence {
  observe(name: string, input: unknown, decision: Decision): void;
  selected(): boolean;
  verified(): boolean;
  answer(): AsyncGenerator<GenerateEvent>;
}

/** Only a named function in an explicitly requested realm can terminate a read-only turn. */
export function realmEvidence(question: string, run: HarnessRun): RealmEvidence {
  const paths = new Set(question.match(/gno\.land\/r\/[a-zA-Z0-9_./-]+/g)?.map(path => path.replace(/\.+$/, '')));
  const identifiers = new Set(question.match(/[A-Za-z_][A-Za-z_0-9]*/g));
  let target: { path: string; fn: z.infer<typeof location> } | undefined;
  let selected = false;
  let verified = false;
  return {
    observe(name: string, input: unknown, decision: Decision) {
      if (name !== 'get_realm_info' || paths.size !== 1) return;
      const result = data(index).safeParse(decision);
      if (!result.success) return;
      const info = result.data.value.untrustedData;
      const matches = info.functions.filter(fn => identifiers.has(fn.name));
      if (!matches.length) return;
      selected = true;
      const match = location.safeParse(matches[0]);
      if (!match.success || matches.length !== 1 || !paths.has(info.path)) return;
      const fn = match.data;
      if (z.object({ path: z.literal(info.path) }).safeParse(input).success &&
        info.sourceFiles?.includes(fn.filename) && /^[\w.-]+\.gno$/.test(fn.filename)) target = { path: info.path, fn };
    },
    selected: () => selected,
    verified: () => verified,
    async *answer(): AsyncGenerator<GenerateEvent> {
      let answer = failure;
      if (target && !run.signal.aborted) {
        const { path, fn } = target;
        const name = 'get_realm_source';
        const input = { path, filename: fn.filename };
        const id = `${run.operationId}:source`;
        yield { type: 'tool-call', name, input, id, invalid: false };
        const output = await run.dispatch({ name, input });
        yield { type: 'tool-result', id, name, output };
        const result = data(file).safeParse(output);
        if (result.success) {
          const source = file.parse(result.data.value.untrustedData);
          const lines = source.content.split(/\r?\n/);
          const start = fn.line - 1;
          const decl = lines[start]?.trimEnd() ?? '';
          if (source.path === path && source.filename === fn.filename && fn.signature.startsWith(`func ${fn.name}(`) && decl.startsWith(fn.signature) && /^\s*\{/.test(decl.slice(fn.signature.length))) {
            verified = true;
            let comment = start;
            while (comment > 0 && start - comment < 12 && lines[comment - 1].startsWith('//')) comment--;
            let end = start + 1;
            if (!decl.endsWith('}')) {
              while (end < lines.length && end - start < 18 && !/^\S/.test(lines[end])) end++;
              if (lines[end] === '}') end++;
            }
            answer = `${path}/${fn.filename}:${fn.line}\n${lines.slice(comment, end).join('\n')}`;
          }
        }
      }
      if (!run.signal.aborted) yield { type: 'text', delta: answer };
    },
  };
}
