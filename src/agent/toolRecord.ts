import { z } from 'zod';

import type { CallRecord } from '../llm/core';

// What the agent keeps of its tool calls in the conversation, so that a later turn knows what was
// called and what came of it. Written by code from the call and its outcome: raw tool output is
// untrusted data (it can carry instructions), so it never enters the history.

const HEADER =
  '[tool record: past results only. Values may be stale: read again for current data. A completed action is never repeated.]';
const MAX_LINES = 8;
const MAX_INPUT_CHARS = 140;
// Below the session's limit for a stored record.
const MAX_CHARS = 1_800;

// The few fields of a tool outcome the record uses; anything else is ignored.
const outcomeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('denied'), code: z.string() }),
  z.object({
    kind: z.literal('result'),
    value: z.object({
      status: z.string().optional(),
      code: z.string().optional(),
      to: z.string().optional(),
      spender: z.string().optional(),
      amount: z.string().optional(),
      token: z.string().optional(),
    }),
  }),
]);

const shorten = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}...` : text);

/** What came of one call, in a few words. */
function outcome({ output }: CallRecord): string {
  const parsed = outcomeSchema.safeParse(output);
  if (!parsed.success) return output === undefined ? 'failed' : 'no result';
  if (parsed.data.kind === 'denied') return `denied (${parsed.data.code})`;
  const { status, code, to, spender, amount, token } = parsed.data.value;
  if (status === 'prepared') return `prepared, unsigned and completed: ${amount} ${token} to ${to ?? spender}`;
  if (status === 'error') return `refused (${code})`;
  return status ?? 'read';
}

/** The record of a turn's tool calls, or undefined when it made none. */
export function describeToolRecord(calls: readonly CallRecord[]): string | undefined {
  const lines = calls
    // A call the harness rejected as malformed never ran; the agent retried it.
    .filter((call) => !call.invalid)
    .map((call) => `- ${call.name} ${shorten(JSON.stringify(call.input) ?? '{}', MAX_INPUT_CHARS)} -> ${outcome(call)}`);
  if (lines.length === 0) return undefined;
  const shown = lines.slice(0, MAX_LINES);
  if (lines.length > shown.length) shown.push(`- (${lines.length - shown.length} more calls)`);
  return shorten([HEADER, ...shown].join('\n'), MAX_CHARS);
}
