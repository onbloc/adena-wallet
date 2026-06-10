import {
  getGnoscanChainId,
  getGnoscanChainParameters,
  isGnoscanChainIdSupported,
} from './gnoscan-url';

describe('gnoscan url helpers', () => {
  it('maps internal test-13 network id to Gnoscan testnet-13 chain id', () => {
    expect(getGnoscanChainId('test-13')).toBe('testnet-13');
    expect(getGnoscanChainParameters('test-13')).toEqual({ chainId: 'testnet-13' });
  });

  it('keeps supported Gnoscan chain ids unchanged when no alias is needed', () => {
    expect(getGnoscanChainId('gnoland1')).toBe('gnoland1');
    expect(getGnoscanChainParameters('gnoland1')).toEqual({ chainId: 'gnoland1' });
  });

  it('does not treat custom networks as supported Gnoscan chain ids', () => {
    expect(isGnoscanChainIdSupported('dev.gnoswap')).toBe(false);
    expect(getGnoscanChainParameters('dev.gnoswap')).toBeNull();
  });
});
