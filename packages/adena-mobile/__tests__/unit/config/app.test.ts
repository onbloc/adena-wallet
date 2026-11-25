import { APP_CONFIG } from '../../../src/config/app';

describe('APP_CONFIG', () => {
  it('holds the expected app constants', () => {
    expect(APP_CONFIG).toEqual({
      deepLinkScheme: 'adena',
      autoLockMs: 300_000,
      mnemonicStrength: 256,
      dappRequestMaxBytes: 65_536,
      dappRequestTtlMs: 86_400_000,
    });
  });
});
