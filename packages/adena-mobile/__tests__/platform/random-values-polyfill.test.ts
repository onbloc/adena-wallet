import sodium from 'libsodium-wrappers-sumo';

import {
  getRandomValues,
  installRandomValuesPolyfill,
} from '../../src/platform/random-values-polyfill';

beforeAll(async () => {
  await sodium.ready;
});

describe('getRandomValues polyfill', () => {
  it('fills integer typed arrays, including views', () => {
    const backing = new Uint8Array(64);
    const view = backing.subarray(16, 48);
    getRandomValues(view);

    expect(view.some(byte => byte !== 0)).toBe(true);
    expect(backing.subarray(0, 16).every(byte => byte === 0)).toBe(true);
    expect(backing.subarray(48).every(byte => byte === 0)).toBe(true);
    expect(getRandomValues(new Uint32Array(4))).toHaveLength(4);
  });

  it('rejects requests above the Web Crypto limit', () => {
    expect(() => getRandomValues(new Uint8Array(65537))).toThrow('exceeds');
  });

  it('installs itself as crypto.getRandomValues', () => {
    installRandomValuesPolyfill();
    expect((globalThis as any).crypto.getRandomValues).toBe(getRandomValues);
  });
});
