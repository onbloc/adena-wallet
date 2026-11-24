import { applyToolEvent, type CallRecord } from '../calls';
import { GenerateEventType } from '../generate';

const call = (id: string, name = 'lookup') => ({
  type: GenerateEventType.ToolCall,
  id,
  name,
  input: { key: 'abc' },
  invalid: false,
});

describe('applyToolEvent', () => {
  it('keeps calls in order and attaches each result to its own call', () => {
    let calls: CallRecord[] = [];
    calls = applyToolEvent(calls, call('a'));
    calls = applyToolEvent(calls, call('b', 'send'));
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolResult,
      id: 'b',
      name: 'send',
      output: { status: 'signed' },
    });

    expect(calls.map((c) => [c.id, c.name, c.output])).toEqual([
      ['a', 'lookup', undefined],
      ['b', 'send', { status: 'signed' }],
    ]);
  });

  it('keeps the original validation error when a tool-error follows an invalid call', () => {
    let calls = applyToolEvent([], {
      ...call('a'),
      invalid: true,
      error: 'key: expected string',
    });
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolError,
      id: 'a',
      name: 'lookup',
      error: 'AI_InvalidToolInputError: ...',
    });

    expect(calls[0]).toMatchObject({ invalid: true, error: 'key: expected string' });
  });

  it('records an execution error on a valid call', () => {
    let calls = applyToolEvent([], call('a'));
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolError,
      id: 'a',
      name: 'lookup',
      error: 'boom',
    });

    expect(calls[0]).toMatchObject({ invalid: false, error: 'boom' });
  });
});
