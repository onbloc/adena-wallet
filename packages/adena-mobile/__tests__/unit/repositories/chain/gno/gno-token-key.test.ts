import { parseRegistryKey, stripTokenSequence, toRegistryKey } from '../../../../../src/repositories/chain/gno/gno-token-key';

describe('parseRegistryKey', () => {
  it('splits at the first dot of the last segment', () => {
    expect(parseRegistryKey('gno.land/r/gnoland/wugnot.wugnot')).toEqual({ pkgPath: 'gno.land/r/gnoland/wugnot', symbol: 'wugnot' });
    expect(parseRegistryKey('gno.land/r/demo/foo.FOO.v2')).toEqual({ pkgPath: 'gno.land/r/demo/foo', symbol: 'FOO.v2' });
  });

  it.each([
    'ugnot',
    'foo.BAR',
    'gno.land/r/demo/foo',
    'gno.land/r/demo/foo.',
    '',
  ])('rejects %p', (key) => {
    expect(parseRegistryKey(key)).toBeNull();
  });
});

describe('toRegistryKey', () => {
  it('joins the package path and symbol and round-trips', () => {
    const key = toRegistryKey('gno.land/r/demo/foo', 'FOO');

    expect(key).toBe('gno.land/r/demo/foo.FOO');
    expect(parseRegistryKey(key)).toEqual({ pkgPath: 'gno.land/r/demo/foo', symbol: 'FOO' });
  });
});

describe('stripTokenSequence', () => {
  it('removes a trailing numeric sequence', () => {
    expect(stripTokenSequence('gno.land/r/gnoswap/gns.GNS.0000000')).toBe('gno.land/r/gnoswap/gns.GNS');
    expect(stripTokenSequence('gno.land/r/demo/foo.FOO.12')).toBe('gno.land/r/demo/foo.FOO');
  });

  it.each([
    'ugnot',
    'gno.land/r/demo/foo.FOO',
    'gno.land/r/demo/foo.FOO.abc',
    'gno.land/r/demo/foo.12',
    'foo.FOO.1',
  ])('keeps %p unchanged', (id) => {
    expect(stripTokenSequence(id)).toBe(id);
  });
});
