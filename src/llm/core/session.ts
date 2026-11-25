import type { ModelMessage } from 'ai';
import { z } from 'zod';

export type ChatScope =
  | { mode: 'plain' | 'mock' }
  | { mode: 'onbloc'; endpoint: string; chainId: string; account: string };

const maxTurns = 50;
const turnSchema = z.strictObject({
  prompt: z.string().min(1).max(16_384),
  answer: z.string().min(1).max(32_768),
  /** What the agent called and what came of it, written by code: see `describeToolRecord`. */
  record: z.string().min(1).max(2_048).optional(),
});
const snapshotSchema = z.strictObject({ version: z.literal(1), turns: z.array(turnSchema).max(maxTurns) });
export type ChatTurn = Readonly<z.infer<typeof turnSchema>>;

export type ChatSession = {
  readonly turns: readonly ChatTurn[];
  messages(prompt: string): ModelMessage[];
  complete(prompt: string, answer: string, record?: string): boolean;
  trimOldest(count: number): void;
  reset(): void;
  serialize(): string;
};

export function chatSessionKey(scope: ChatScope): string {
  return scope.mode === 'onbloc'
    ? JSON.stringify(['adena-chat-v1', scope.mode, scope.endpoint, scope.chainId, scope.account])
    : JSON.stringify(['adena-chat-v1', scope.mode]);
}

export function canRememberTurn(event: { aborted: boolean; finishReason?: string; verifiedAnswer?: true; messages: readonly ModelMessage[] }): boolean {
  return !event.aborted && (event.verifiedAnswer === true || (event.finishReason === 'stop' && event.messages.length > 0));
}

/** Persists user and answer text with a compact tool record, never raw tool output or wallet state. */
export function createChatSession(saved?: string | null): ChatSession {
  let turns: readonly ChatTurn[] = [];
  if (saved) {
    let decoded: unknown;
    try { decoded = JSON.parse(saved); } catch { /* Discard corrupt snapshots. */ }
    const parsed = snapshotSchema.safeParse(decoded);
    if (parsed.success) turns = parsed.data.turns;
  }
  return {
    get turns() { return turns; },
    messages(prompt: string): ModelMessage[] {
      const messages: ModelMessage[] = [];
      for (const turn of turns) {
        messages.push({ role: 'user', content: turn.prompt }, { role: 'assistant', content: turn.record ? `${turn.answer}\n\n${turn.record}` : turn.answer });
      }
      messages.push({ role: 'user', content: prompt });
      return messages;
    },
    complete(prompt: string, answer: string, record?: string): boolean {
      const parsed = turnSchema.safeParse({ prompt, answer, ...(record ? { record } : {}) });
      if (!parsed.success || !prompt.trim() || !answer.trim()) return false;
      turns = [...turns.slice(-(maxTurns - 1)), parsed.data];
      return true;
    },
    trimOldest(count: number) {
      if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Turn count must be a nonnegative safe integer.');
      if (count > 0) turns = turns.slice(count);
    },
    reset() { turns = []; },
    serialize() { return JSON.stringify({ version: 1, turns }); },
  };
}

/** Drop only completed text turns; never remove the current request or its tool exchange. */
export function compactContext(messages: ModelMessage[], fits: (candidate: ModelMessage[]) => boolean): ModelMessage[] | undefined {
  if (fits(messages)) return messages;
  let currentTurn = messages.length - 1;
  while (currentTurn >= 0 && messages[currentTurn].role !== 'user') currentTurn--;
  if (currentTurn <= 0 || currentTurn % 2 !== 0) return undefined;
  for (let i = 0; i < currentTurn; i++) {
    if (messages[i].role !== (i % 2 === 0 ? 'user' : 'assistant') || typeof messages[i].content !== 'string') return undefined;
  }
  if (!fits(messages.slice(currentTurn))) return undefined;
  let low = 1;
  let high = currentTurn / 2;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (fits(messages.slice(middle * 2))) high = middle;
    else low = middle + 1;
  }
  return messages.slice(low * 2);
}

/** Match the device's conservative byte-based estimate, including chat-template overhead. */
export function estimateContextInput(input: unknown): number {
  return Math.ceil(new TextEncoder().encode(JSON.stringify(input)).byteLength / 2) + 512;
}
