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
  requestedPath(): string | undefined;
  selected(): boolean;
  verified(): boolean;
  answer(): AsyncGenerator<GenerateEvent>;
}

/** Find the end of the indexed function, ignoring braces in strings and comments. */
function functionEnd(lines: string[], start: number, opening: number): number | undefined {
  let depth = 0;
  let mode: 'code' | 'block' | 'string' | 'rune' | 'raw' = 'code';
  let escaped = false;
  for (let line = start; line < lines.length && line - start < 18; line++) {
    const content = lines[line];
    for (let i = line === start ? opening : 0; i < content.length; i++) {
      const char = content[i];
      const next = content[i + 1];
      if (mode === 'block') {
        if (char === '*' && next === '/') { mode = 'code'; i++; }
      } else if (mode === 'raw') {
        if (char === '`') mode = 'code';
      } else if (mode === 'string' || mode === 'rune') {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === (mode === 'string' ? '"' : "'")) mode = 'code';
      } else if (char === '/' && next === '/') {
        break;
      } else if (char === '/' && next === '*') {
        mode = 'block';
        i++;
      } else if (char === '"' || char === "'" || char === '`') {
        mode = char === '"' ? 'string' : char === "'" ? 'rune' : 'raw';
      } else if (char === '{') {
        depth++;
      } else if (char === '}' && --depth === 0) {
        return line + 1;
      }
    }
    if (mode === 'string' || mode === 'rune') return undefined;
  }
  return undefined;
}

/** Only a named function in an explicitly requested realm can terminate a read-only turn. */
export function realmEvidence(question: string, run: HarnessRun, query = ''): RealmEvidence {
  const paths = new Set(question.match(/gno\.land\/r\/[a-zA-Z0-9_./-]+/g)?.map(path => path.replace(/\.+$/, '')));
  const identifiers = new Set(question.replace(/gno\.land\/r\/[a-zA-Z0-9_./-]+/g, '').match(/[A-Za-z_][A-Za-z_0-9]*/g));
  const explicitSource = /(?:\b(?:function|functions|implements?|implementation|source|defined)\b|함수|구현|소스|정의)/iu.test(`${question}\n${query}`);
  let target: { path: string; fn: z.infer<typeof location> } | undefined;
  let selected = false;
  let verified = false;
  return {
    requestedPath: () => paths.size === 1 && explicitSource && identifiers.size > 0 ? [...paths][0] : undefined,
    observe(name: string, input: unknown, decision: Decision) {
      if (name !== 'get_realm_info' || paths.size !== 1) return;
      if (explicitSource && identifiers.size > 0) selected = true;
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
      if (target && !run.signal.aborted && run.tools.some(tool => tool.name === 'get_realm_source')) {
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
            let comment = start;
            while (comment > 0 && start - comment < 12 && lines[comment - 1].startsWith('//')) comment--;
            const opening = decl.indexOf('{', fn.signature.length);
            const end = functionEnd(lines, start, opening);
            if (end !== undefined) {
              verified = true;
              answer = `${path}/${fn.filename}:${fn.line}\n${lines.slice(comment, end).join('\n')}`;
            }
          }
        }
      }
      if (!run.signal.aborted) yield { type: 'text', delta: answer };
    },
  };
}
