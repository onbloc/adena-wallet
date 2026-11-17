import { AgentApprovalQueue, AgentRequestRegistry } from './agent-approval-queue';
import { AgentHostRequestError } from './agent-host-protocol';

const deferred = (): { promise: Promise<void>; resolve: () => void } => {
  let resolve = (): void => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

const codeOf = async (promise: Promise<unknown>): Promise<string | undefined> =>
  promise.then(
    () => undefined,
    (error) => (error as AgentHostRequestError).code,
  );

describe('AgentApprovalQueue', () => {
  it('runs one task at a time in order', async () => {
    const queue = new AgentApprovalQueue(4);
    const first = deferred();
    const order: string[] = [];

    const a = queue.run(async () => {
      order.push('a:start');
      await first.promise;
      order.push('a:end');
    }, new AbortController().signal);
    const b = queue.run(async () => {
      order.push('b');
    }, new AbortController().signal);

    await Promise.resolve();
    expect(order).toEqual(['a:start']);

    first.resolve();
    await Promise.all([a, b]);
    expect(order).toEqual(['a:start', 'a:end', 'b']);
  });

  it('skips a waiting task that was aborted', async () => {
    const queue = new AgentApprovalQueue(4);
    const first = deferred();
    const task = jest.fn(async () => undefined);
    const controller = new AbortController();

    const a = queue.run(() => first.promise, new AbortController().signal);
    const b = queue.run(task, controller.signal);
    controller.abort();
    first.resolve();

    await a;
    await expect(codeOf(b)).resolves.toBe('cancelled');
    expect(task).not.toHaveBeenCalled();
  });

  it('keeps running after a task fails', async () => {
    const queue = new AgentApprovalQueue(4);
    const failed = queue.run(async () => {
      throw new Error('boom');
    }, new AbortController().signal);
    const next = queue.run(async () => 'ok', new AbortController().signal);

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('ok');
  });

  it('refuses work beyond its size', async () => {
    const queue = new AgentApprovalQueue(1);
    const first = deferred();
    const a = queue.run(() => first.promise, new AbortController().signal);

    await expect(
      codeOf(queue.run(async () => undefined, new AbortController().signal)),
    ).resolves.toBe('approval_pending');

    first.resolve();
    await a;
  });
});

describe('AgentRequestRegistry', () => {
  // Models a request that is still preparing (wallet checks, gas pricing) when
  // the cancellation arrives, then reaches the approval queue.
  const prepareThenQueue = async (
    registry: AgentRequestRegistry,
    cancelDuringPreparation: () => void,
  ): Promise<{ code: string | undefined; opened: boolean }> => {
    const queue = new AgentApprovalQueue(4);
    const signal = registry.begin('7');
    const preparation = deferred();
    let opened = false;

    const run = (async (): Promise<void> => {
      await preparation.promise;
      await queue.run(async () => {
        opened = true;
      }, signal);
    })();

    cancelDuringPreparation();
    preparation.resolve();

    const code = await codeOf(run);
    registry.end('7', signal);
    return { code, opened };
  };

  it('stops a request cancelled before its popup is queued', async () => {
    const registry = new AgentRequestRegistry();
    const result = await prepareThenQueue(registry, () => registry.cancel('7'));
    expect(result).toEqual({ code: 'cancelled', opened: false });
  });

  it('stops a preparing request when the channel closes', async () => {
    const registry = new AgentRequestRegistry();
    const result = await prepareThenQueue(registry, () => registry.cancelAll());
    expect(result).toEqual({ code: 'cancelled', opened: false });
  });

  it('ignores cancels for other or finished requests', async () => {
    const registry = new AgentRequestRegistry();
    const signal = registry.begin('1');

    registry.cancel('2');
    expect(signal.aborted).toBe(false);

    registry.end('1', signal);
    registry.cancel('1');
    expect(signal.aborted).toBe(false);
  });

  it('replaces a reused id without letting the old request end the new one', () => {
    const registry = new AgentRequestRegistry();
    const first = registry.begin('1');
    const second = registry.begin('1');

    expect(first.aborted).toBe(true);
    registry.end('1', first);
    registry.cancel('1');
    expect(second.aborted).toBe(true);
  });
});
