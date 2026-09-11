import {
  getGnoscanChainId,
  getGnoscanChainParameters,
  isGnoscanChainIdSupported,
} from './gnoscan-url';

describe('gnoscan url helpers', () => {
  it('maps internal staging network id to Gnoscan staging chain id', () => {
    expect(getGnoscanChainId('staging')).toBe('staging');
    expect(getGnoscanChainParameters('staging')).toEqual({ chainId: 'staging' });
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
