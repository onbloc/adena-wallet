import { createFaviconByHostname, decodeParameter, encodeParameter } from './client-utils';

describe('client-utils parameter encoding', () => {
  it('round-trips bigint values as decimal strings', () => {
    const encoded = encodeParameter({
      data: {
        expires_at: BigInt('1779436464'),
        spend_period: BigInt(60),
      },
    });

    expect(encoded).not.toBe('');
    expect(decodeParameter(encoded)).toEqual({
      data: {
        expires_at: '1779436464',
        spend_period: '60',
      },
    });
  });

  it('returns an empty object for empty encoded data', () => {
    expect(decodeParameter('')).toEqual({});
  });

  it('skips favicon lookup for non-web origins', async () => {
    await expect(createFaviconByHostname('extension//adena-wallet')).resolves.toBeNull();
  });
});
