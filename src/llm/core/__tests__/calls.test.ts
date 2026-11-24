import { ToolName, TokenSymbol, WalletStatus } from '../../../agent/wallet/constants';
import { applyToolEvent, type CallRecord } from '../calls';
import { GenerateEventType } from '../generate';

const call = (id: string, name: ToolName = ToolName.GetApprovals) => ({
  type: GenerateEventType.ToolCall,
  id,
  name,
  input: { token: TokenSymbol.Gnot },
  invalid: false,
});

describe('applyToolEvent', () => {
  it('keeps calls in order and attaches each result to its own call', () => {
    let calls: CallRecord[] = [];
    calls = applyToolEvent(calls, call('a'));
    calls = applyToolEvent(calls, call('b', ToolName.Transfer));
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolResult,
      id: 'b',
      name: ToolName.Transfer,
      output: { status: WalletStatus.Signed },
    });

    expect(calls.map((c) => [c.id, c.name, c.output])).toEqual([
      ['a', ToolName.GetApprovals, undefined],
      ['b', ToolName.Transfer, { status: WalletStatus.Signed }],
    ]);
  });

  it('keeps the original validation error when a tool-error follows an invalid call', () => {
    let calls = applyToolEvent([], {
      ...call('a'),
      invalid: true,
      error: 'amount: expected string',
    });
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolError,
      id: 'a',
      name: ToolName.GetApprovals,
      error: 'AI_InvalidToolInputError: ...',
    });

    expect(calls[0]).toMatchObject({ invalid: true, error: 'amount: expected string' });
  });

  it('records an execution error on a valid call', () => {
    let calls = applyToolEvent([], call('a'));
    calls = applyToolEvent(calls, {
      type: GenerateEventType.ToolError,
      id: 'a',
      name: ToolName.GetApprovals,
      error: 'boom',
    });

    expect(calls[0]).toMatchObject({ invalid: false, error: 'boom' });
  });
});
