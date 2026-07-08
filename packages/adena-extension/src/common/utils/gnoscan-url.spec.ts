import {
  getGnoscanChainId,
  getGnoscanChainParameters,
  isGnoscanChainIdSupported,
  normalizeGnoscanTxHash,
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

  describe('normalizeGnoscanTxHash', () => {
    it('converts an uppercase hex tx hash from a broadcast response to base64', () => {
      expect(
        normalizeGnoscanTxHash(
          '98C592D248A40F047012B075BD560F439CE3ED9295CDBEA62C873E20BBD0BD0B',
        ),
      ).toBe('mMWS0kikDwRwErB1vVYPQ5zj7ZKVzb6mLIc+ILvQvQs=');
    });

    it('handles lowercase hex tx hashes', () => {
      expect(
        normalizeGnoscanTxHash(
          'c58d41a26e4a0bf47e88dccba8abc29e821ae3a8db245bb9bcbc0796edb87a47',
        ),
      ).toBe('xY1Bom5KC/R+iNzLqKvCnoIa46jbJFu5vLwHlu24ekc=');
    });

    it('passes an already-base64 tx hash through unchanged', () => {
      const base64Hash = 'mMWS0kikDwRwErB1vVYPQ5zj7ZKVzb6mLIc+ILvQvQs=';
      expect(normalizeGnoscanTxHash(base64Hash)).toBe(base64Hash);
    });
  });
});
