import { applyToolEvent, type CallRecord } from '../calls';

const call = (id: string, name = 'get_balance') => ({
  type: 'tool-call' as const,
  id,
  name,
  input: { token: 'GNOT' },
  invalid: false,
});

describe('applyToolEvent', () => {
  it('keeps calls in order and attaches each result to its own call', () => {
    let calls: CallRecord[] = [];
    calls = applyToolEvent(calls, call('a'));
    calls = applyToolEvent(calls, call('b', 'transfer'));
    calls = applyToolEvent(calls, {
      type: 'tool-result',
      id: 'b',
      name: 'transfer',
      output: { status: 'pending_approval' },
    });

    expect(calls.map((c) => [c.id, c.name, c.output])).toEqual([
      ['a', 'get_balance', undefined],
      ['b', 'transfer', { status: 'pending_approval' }],
    ]);
  });

  it('keeps the original validation error when a tool-error follows an invalid call', () => {
    let calls = applyToolEvent([], {
      ...call('a'),
      invalid: true,
      error: 'amount: expected string',
    });
    calls = applyToolEvent(calls, {
      type: 'tool-error',
      id: 'a',
      name: 'get_balance',
      error: 'AI_InvalidToolInputError: ...',
    });

    expect(calls[0]).toMatchObject({ invalid: true, error: 'amount: expected string' });
  });

  it('records an execution error on a valid call', () => {
    let calls = applyToolEvent([], call('a'));
    calls = applyToolEvent(calls, {
      type: 'tool-error',
      id: 'a',
      name: 'get_balance',
      error: 'boom',
    });

    expect(calls[0]).toMatchObject({ invalid: false, error: 'boom' });
  });
});
