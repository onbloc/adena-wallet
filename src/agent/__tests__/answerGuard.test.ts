import { GenerateEventType, type GenerateEvent } from '../../llm/core';
import { guardAnswer } from '../answerGuard';

const isRead = (name: string) => name === 'read';

const metrics = { totalMs: 1 } as Extract<GenerateEvent, { type: 'done' }>['metrics'];
const done = (overrides: Partial<Extract<GenerateEvent, { type: 'done' }>> = {}): GenerateEvent => ({
  type: GenerateEventType.Done,
  metrics,
  aborted: false,
  warnings: [],
  messages: [{ role: 'assistant', content: 'kept' }],
  ...overrides,
});
const text = (delta: string): GenerateEvent => ({ type: GenerateEventType.Text, delta });
const toolCall = (name: string, invalid = false): GenerateEvent => ({
  type: GenerateEventType.ToolCall,
  id: name,
  name,
  input: {},
  invalid,
});
const toolResult = (name: string, output: unknown): GenerateEvent => ({
  type: GenerateEventType.ToolResult,
  id: name,
  name,
  output,
});
const readOk = toolResult('read', { kind: 'result', value: 1 });
const prepared = toolResult('transfer', { kind: 'result', value: { status: 'prepared' } });

async function guard(...events: GenerateEvent[]) {
  const out: GenerateEvent[] = [];
  for await (const event of guardAnswer(
    (async function* () {
      yield* events;
    })(),
    isRead
  )) {
    out.push(event);
  }
  const answer = out.filter((event) => event.type === GenerateEventType.Text).map((event) => event.delta);
  return { out, answer, last: out[out.length - 1] as Extract<GenerateEvent, { type: 'done' }> };
}

describe('guardAnswer', () => {
  it('shows the model text and remembers the turn when a read succeeded', async () => {
    const { answer, last } = await guard(toolCall('read'), readOk, text('You have 5 GNOT'), done());

    expect(answer).toEqual(['You have 5 GNOT']);
    expect(last.messages).toHaveLength(1);
  });

  it('reports a prepared transaction in its own words, whatever the model says, and does not remember the turn', async () => {
    const { answer, last } = await guard(toolCall('transfer'), prepared, text('Payment confirmed on chain.'), done());

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
    expect(last.messages).toEqual([]);
  });

  it.each([
    ['an error result', toolResult('transfer', { kind: 'result', value: { status: 'error', code: 'invalid_address' } })],
    ['a denied call', toolResult('transfer', { kind: 'denied', code: 'BUDGET_EXHAUSTED' })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'x', name: 'transfer', error: 'boom' } as GenerateEvent],
  ])('does not claim a preparation after %s', async (_label, failure) => {
    const { answer } = await guard(toolCall('transfer'), failure, text('Done'), done());

    expect(answer).toEqual(['Transaction preparation was not confirmed.']);
  });

  it.each([
    ['a read that was denied', toolResult('read', { kind: 'denied', code: 'MCP_UNAVAILABLE' })],
    ['a tool error', { type: GenerateEventType.ToolError, id: 'x', name: 'read', error: 'boom' } as GenerateEvent],
    ['an invalid tool call', toolCall('transfer', true)],
  ])('replaces the answer and forgets the turn after %s, even next to a good read', async (_label, failure) => {
    const { answer, last } = await guard(readOk, failure, text('All good'), done());

    expect(answer).toEqual(['Some Onbloc lookups failed. Review the individual tool results.']);
    expect(last.messages).toEqual([]);
  });

  it('says so when a read ran but the model wrote nothing', async () => {
    expect((await guard(readOk, done())).answer).toEqual(['Onbloc returned data; no model summary was produced.']);
  });

  it('uses only the text of the last step', async () => {
    const { answer } = await guard(text('Let me check'), { type: GenerateEventType.StepStart }, readOk, text('Final'), done());

    expect(answer).toEqual(['Final']);
  });

  it('passes an aborted run through without an answer of its own', async () => {
    const { answer, last } = await guard(text('half an ans'), done({ aborted: true }));

    expect(answer).toEqual([]);
    expect(last.aborted).toBe(true);
  });

  it('still reports a transaction that was prepared before the run was aborted', async () => {
    const { answer } = await guard(prepared, done({ aborted: true }));

    expect(answer).toEqual(['Unsigned transaction prepared. Nothing was sent.']);
  });
});
