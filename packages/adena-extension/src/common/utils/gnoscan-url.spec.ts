import {
  getGnoscanChainId,
  getGnoscanChainParameters,
  isGnoscanChainIdSupported,
} from './gnoscan-url';

describe('gnoscan url helpers', () => {
  it('maps internal pearl-1 network id to Gnoscan pearl-1 chain id', () => {
    expect(getGnoscanChainId('pearl-1')).toBe('pearl-1');
    expect(getGnoscanChainParameters('pearl-1')).toEqual({ chainId: 'pearl-1' });
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
