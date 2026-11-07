import {establishSite, normalizeChainIds} from '../../src/core/establish';

const site = {
  hostname: 'dapp.example',
  accountId: 'acc',
  appName: 'App',
  favicon: null,
};

function fakeServices(failOn?: string) {
  const saved: Record<string, string[]> = {gno: [], atomone: []};
  const service = (group: 'gno' | 'atomone') => ({
    establishBy: jest.fn(async (_account: string, chainId: string) => {
      if (chainId === failOn) {
        throw new Error('boom');
      }
      saved[group].push(chainId);
    }),
    unEstablishBy: jest.fn(
      async (_account: string, _host: string, chainId: string) => {
        saved[group] = saved[group].filter(id => id !== chainId);
      },
    ),
  });
  const base = {
    chainRegistry: {
      getChainByChainId: (chainId: string) =>
        chainId.startsWith('atomone')
          ? {chainGroup: 'atomone'}
          : {chainGroup: 'gno'},
    },
    establishService: service('gno'),
    establishAtomOneService: service('atomone'),
  };
  return {base: base as any, saved};
}

describe('normalizeChainIds', () => {
  it('reads a string, an array or nothing as the extension does', () => {
    expect(normalizeChainIds('test11')).toEqual(['test11']);
    expect(normalizeChainIds(['test11', '', 3, 'atomone-1'])).toEqual([
      'test11',
      'atomone-1',
    ]);
    expect(normalizeChainIds([])).toEqual([]);
    expect(normalizeChainIds(undefined)).toEqual([]);
  });
});

describe('establishSite', () => {
  it('connects the current network when the request names no chain', async () => {
    const {base, saved} = fakeServices();
    await establishSite(base, site, [], 'test11');
    expect(saved.gno).toEqual(['test11']);
  });

  it('saves AtomOne chains with the AtomOne service', async () => {
    const {base, saved} = fakeServices();
    await establishSite(base, site, ['test11', 'atomone-1'], 'test11');
    expect(saved).toEqual({gno: ['test11'], atomone: ['atomone-1']});
  });

  it('undoes the saved chains when a later one fails', async () => {
    const {base, saved} = fakeServices('portal-loop');
    await expect(
      establishSite(
        base,
        site,
        ['test11', 'atomone-1', 'portal-loop'],
        'test11',
      ),
    ).rejects.toThrow('boom');
    expect(saved).toEqual({gno: [], atomone: []});
  });
});
