import { ConcurrencyLimiter } from '../../../src/utils/concurrency-limiter';

const flush = () => new Promise(resolve => setImmediate(resolve));

describe('ConcurrencyLimiter', () => {
  it('never exceeds the limit while tasks keep arriving', async () => {
    const limiter = new ConcurrencyLimiter(2);
    const release: (() => void)[] = [];
    let active = 0;
    let peak = 0;
    const task = () => limiter.run(() => {
      active++;
      peak = Math.max(peak, active);
      return new Promise<void>(resolve => release.push(() => {
        active--;
        resolve();
      }));
    });
    const runs = [task(), task(), task()];

    await flush();
    expect(active).toBe(2);
    release.shift()!();
    runs.push(task());
    await flush();
    expect(peak).toBe(2);

    while (release.length > 0) {
      release.shift()!();
      await flush();
    }

    await Promise.all(runs);
    expect(peak).toBe(2);
  });

  it('runs waiting tasks in call order and survives failures', async () => {
    const limiter = new ConcurrencyLimiter(1);
    const order: string[] = [];
    const failing = limiter.run(async () => {
      order.push('a');
      throw new Error('a failed');
    });
    const later = ['b', 'c'].map(name => limiter.run(async () => {
      order.push(name);
      return name;
    }));

    await expect(failing).rejects.toThrow('a failed');
    await expect(Promise.all(later)).resolves.toEqual(['b', 'c']);
    expect(order).toEqual(['a', 'b', 'c']);
  });
});
