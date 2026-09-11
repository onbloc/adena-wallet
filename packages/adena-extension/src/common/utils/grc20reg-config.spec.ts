import GRC20REG_DATA from '@resources/chains/grc20reg.json';
import CHAIN_DATA from '@resources/chains/chains.json';
import {
  DEFAULT_GRC20_TRANSFER_EVENT,
  getGrc20RegConfig,
  getGrc20RegistryPaths,
  resolveGrc20TransferEvent,
} from './grc20reg-config';

describe('grc20reg-config', () => {
  it('has an entry for every bundled chain', () => {
    const configured = Object.keys(GRC20REG_DATA);
    CHAIN_DATA.forEach((chain) => {
      expect(configured).toContain(chain.chainId);
    });
  });

  it('lists registries newest first so the v1 registry is preferred', () => {
    expect(getGrc20RegistryPaths('gnoland-1')).toEqual([
      'gno.land/r/demo/defi/grc20reg/v1',
      'gno.land/r/demo/defi/grc20reg',
    ]);
  });

  it('describes every token package version with its event shape', () => {
    const { tokenPackages } = getGrc20RegConfig('gnoland-1');
    expect(tokenPackages.map((tokenPackage) => tokenPackage.path)).toEqual([
      'gno.land/p/nt/grc20/v0',
    ]);
    tokenPackages.forEach((tokenPackage) => {
      expect(tokenPackage.transferEvent).toEqual(DEFAULT_GRC20_TRANSFER_EVENT);
    });
  });

  it('reports no helper realm when a chain declares none', () => {
    expect(getGrc20RegConfig('gnoland-1').helperPath).toBe('');
    expect(getGrc20RegConfig('dev.gnoswap').helperPath).toBe('');
  });

  it('falls back to the historical paths for an unknown chain', () => {
    const config = getGrc20RegConfig('custom-chain');
    expect(config.registries).toEqual([{ path: 'gno.land/r/demo/defi/grc20reg' }]);
    expect(config.tokenPackages).toEqual([
      { path: 'gno.land/p/demo/tokens/grc20', transferEvent: DEFAULT_GRC20_TRANSFER_EVENT },
    ]);
    expect(config.helperPath).toBe('');
  });

  it('resolves the event shape by emitting package and defaults otherwise', () => {
    const custom = {
      path: 'gno.land/p/nt/grc20/v9',
      transferEvent: {
        type: 'Transferred',
        tokenAttr: 'id',
        fromAttr: 'sender',
        toAttr: 'recipient',
        valueAttr: 'amount',
      },
    };
    expect(resolveGrc20TransferEvent(custom.path, [custom])).toEqual(custom.transferEvent);
    expect(resolveGrc20TransferEvent('gno.land/p/other', [custom])).toEqual(
      DEFAULT_GRC20_TRANSFER_EVENT,
    );
    expect(resolveGrc20TransferEvent(undefined, undefined)).toEqual(DEFAULT_GRC20_TRANSFER_EVENT);
  });
});
