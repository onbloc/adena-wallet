import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';

import {
  createCachedGnoProviderFactory,
  DEFAULT_GNO_RPC_TIMEOUT_MS,
  GnoRpcTimeoutError,
  withReadTimeout,
} from '../../../../../src/repositories/chain/gno/gno-provider';

const never = <T>(): Promise<T> => new Promise<T>(() => undefined);

describe('createCachedGnoProviderFactory', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates one provider per RPC url', async () => {
    const create = jest.spyOn(GnoJSONRPCProvider, 'create').mockImplementation(async url => ({ url }) as unknown as GnoJSONRPCProvider);
    const factory = createCachedGnoProviderFactory();

    const first = factory('https://a');

    expect(factory('https://a')).toBe(first);
    await expect(first).resolves.toEqual({ url: 'https://a' });
    await expect(factory('https://b')).resolves.toEqual({ url: 'https://b' });
    expect(create.mock.calls.map(([url]) => url)).toEqual(['https://a', 'https://b']);
  });

  it('keeps caches independent between factories', () => {
    jest.spyOn(GnoJSONRPCProvider, 'create').mockImplementation(async () => ({}) as GnoJSONRPCProvider);

    expect(createCachedGnoProviderFactory()('https://a')).not.toBe(createCachedGnoProviderFactory()('https://a'));
  });

  it('evicts failed connections so the next call retries', async () => {
    const create = jest.spyOn(GnoJSONRPCProvider, 'create')
      .mockRejectedValueOnce(new Error('dial failed'))
      .mockResolvedValueOnce({ ok: true } as unknown as GnoJSONRPCProvider);
    const factory = createCachedGnoProviderFactory();

    await expect(factory('https://a')).rejects.toThrow('dial failed');
    await expect(factory('https://a')).resolves.toEqual({ ok: true });
    expect(create).toHaveBeenCalledTimes(2);
  });
});

describe('RPC timeouts', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const stalled = () => ({
    evaluateExpression: jest.fn(() => never<string>()),
    getFunctionSignatures: jest.fn(() => never<unknown[]>()),
    abciQuery: jest.fn(() => never<unknown>()),
    sendTransaction: jest.fn(() => never<unknown>()),
    waitForTransaction: jest.fn(() => never<unknown>()),
    ready: jest.fn(async (value: string) => `ok:${value}`),
    label: 'provider',
  });

  it('rejects stalled read calls with a typed timeout error', async () => {
    const provider = withReadTimeout(stalled(), 1_000);
    const reads = [provider.evaluateExpression(), provider.getFunctionSignatures(), provider.abciQuery()];

    reads.forEach(read => read.catch(() => undefined));
    jest.advanceTimersByTime(1_000);

    for (const read of reads) {
      await expect(read).rejects.toBeInstanceOf(GnoRpcTimeoutError);
    }

    await expect(reads[0]).rejects.toMatchObject({ operation: 'evaluateExpression', timeoutMs: 1_000 });
  });

  it('never times out a broadcast or a tx wait, and passes other members through', async () => {
    const raw = stalled();
    const provider = withReadTimeout(raw, 1_000);
    const settled = jest.fn();

    provider.sendTransaction().then(settled, settled);
    provider.waitForTransaction().then(settled, settled);
    jest.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(settled).not.toHaveBeenCalled();
    expect(provider.sendTransaction).toBe(raw.sendTransaction);
    expect(provider.label).toBe('provider');
    await expect(provider.ready('x')).resolves.toBe('ok:x');
  });

  it('resolves fast reads and keeps their errors', async () => {
    const provider = withReadTimeout({
      evaluateExpression: jest.fn(async () => 'value'),
      getFunctionSignatures: jest.fn(async () => {
        throw new Error('boom');
      }),
    }, 1_000);

    await expect(provider.evaluateExpression()).resolves.toBe('value');
    await expect(provider.getFunctionSignatures()).rejects.toThrow('boom');
  });

  it('bounds the connection probe and the provider reads from the cached factory', async () => {
    jest.spyOn(GnoJSONRPCProvider, 'create')
      .mockImplementationOnce(() => never())
      .mockResolvedValueOnce(stalled() as unknown as GnoJSONRPCProvider);
    const factory = createCachedGnoProviderFactory();
    const first = factory('https://a');

    first.catch(() => undefined);
    jest.advanceTimersByTime(DEFAULT_GNO_RPC_TIMEOUT_MS);
    await expect(first).rejects.toMatchObject({ operation: 'connect' });

    const provider = await factory('https://a');
    const read = provider.evaluateExpression('pkg', 'X()');

    read.catch(() => undefined);
    jest.advanceTimersByTime(DEFAULT_GNO_RPC_TIMEOUT_MS);
    await expect(read).rejects.toBeInstanceOf(GnoRpcTimeoutError);
  });
});
