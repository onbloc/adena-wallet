import { SerialQueue } from '../../../src/utils/serial-queue';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });

  return { promise, resolve };
};

describe('SerialQueue', () => {
  it('starts each task only after the previous one settles', async () => {
    const queue = new SerialQueue();
    const gate = deferred();
    const order: string[] = [];

    const first = queue.run(async () => {
      order.push('first:start');
      await gate.promise;
      order.push('first:end');
    });
    const second = queue.run(async () => {
      order.push('second');
    });

    await Promise.resolve();
    expect(order).toEqual(['first:start']);
    gate.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(['first:start', 'first:end', 'second']);
  });

  it('keeps running after a task fails', async () => {
    const queue = new SerialQueue();
    const failed = queue.run(async () => {
      throw new Error('boom');
    });

    await expect(failed).rejects.toThrow('boom');
    await expect(queue.run(async () => 'next')).resolves.toBe('next');
  });
});
