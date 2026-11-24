import { GnoJSONRPCProvider } from '@gnolang/gno-js-client';

import { createCachedGnoProviderFactory } from '../../../../../src/repositories/chain/gno/gno-provider';

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
