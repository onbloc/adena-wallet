import {
  getGnoscanChainId,
  getGnoscanChainParameters,
  isGnoscanChainIdSupported,
} from './gnoscan-url';

describe('gnoscan url helpers', () => {
  it('maps the onyx-1 testnet id to the Gnoscan onyx-1 chain id', () => {
    expect(getGnoscanChainId('onyx-1')).toBe('onyx-1');
    expect(getGnoscanChainParameters('onyx-1')).toEqual({ chainId: 'onyx-1' });
  });

  it('keeps supported Gnoscan chain ids unchanged when no alias is needed', () => {
    expect(getGnoscanChainId('gnoland-1')).toBe('gnoland-1');
    expect(getGnoscanChainParameters('gnoland-1')).toEqual({ chainId: 'gnoland-1' });
  });

  it('does not treat custom networks as supported Gnoscan chain ids', () => {
    expect(isGnoscanChainIdSupported('dev.gnoswap')).toBe(false);
    expect(getGnoscanChainParameters('dev.gnoswap')).toBeNull();
  });
});
