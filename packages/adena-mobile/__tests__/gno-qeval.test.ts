import { buildGrc20TransferMessage, resolveRouteArgs } from '../src/repositories/chain/gno/gno-grc20-transfer';
import { buildIife, decodeGoString, gnoLiteral, parseQEvalResult } from '../src/repositories/chain/gno/gno-qeval';
import { parseRegistryKey, stripTokenSequence } from '../src/repositories/chain/gno/gno-token-key';
import { getGrc20RegistryConfig } from '../src/resources';

describe('qeval helpers', () => {
  it('parses multi-tuple node output, including quoted strings with spaces', () => {
    // Captured from gnoland-1 for the registry listing expression.
    const raw = '(27 int)\n("gno.land/r/a.X,gno.land/r/b.Y (beta)," string)';

    expect(parseQEvalResult(raw)).toEqual([
      { value: '27', type: 'int' },
      { value: '"gno.land/r/a.X,gno.land/r/b.Y (beta),"', type: 'string' },
    ]);
  });

  it('round-trips Go string literals', () => {
    const tricky = 'quote " slash \\ newline \n tab \t bell \x07 한글';

    expect(decodeGoString(gnoLiteral(tricky))).toBe(tricky);
  });

  it('builds IIFE expressions', () => {
    expect(buildIife('(int)', ['a := 1'], 'a')).toBe('(func() (int) { a := 1; return a })()');
  });

  it('parses registry keys and strips on-chain sequences', () => {
    expect(parseRegistryKey('gno.land/r/gnoland/wugnot.wugnot')).toEqual({ pkgPath: 'gno.land/r/gnoland/wugnot', symbol: 'wugnot' });
    expect(parseRegistryKey('gno.land/r/demo/foo')).toBeNull();
    expect(stripTokenSequence('gno.land/r/gnoswap/gns.GNS.0000000')).toBe('gno.land/r/gnoswap/gns.GNS');
    expect(stripTokenSequence('ugnot')).toBe('ugnot');
  });
});

describe('GRC20 transfer messages', () => {
  const base = {
    caller: 'g1caller',
    registryKey: 'gno.land/r/demo/foo.FOO',
    pkgPath: 'gno.land/r/demo/foo',
    toAddress: 'g1to',
    amount: '1500',
    config: getGrc20RegistryConfig('gnoland-1'),
  };

  it('prefers the token route', () => {
    expect(buildGrc20TransferMessage({ ...base, route: { name: 'Transfer', args: ['$to', '$amount'] } })).toEqual({
      type: '/vm.m_call',
      value: { caller: 'g1caller', send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/foo', func: 'Transfer', args: ['g1to', '1500'] },
    });
  });

  it('rejects routes with unknown placeholders', () => {
    expect(resolveRouteArgs({ name: 'Transfer', args: ['$reciever'] }, { to: 'g1to' })).toBeNull();
    expect(resolveRouteArgs({ name: 'Transfer', args: ['$$literal'] }, {})).toEqual(['$literal']);
  });

  it('uses the helper realm when configured', () => {
    const message = buildGrc20TransferMessage({ ...base, config: { ...base.config, helperPath: 'gno.land/r/helper' } });

    expect(message).toMatchObject({ type: '/vm.m_call', value: { pkg_path: 'gno.land/r/helper', args: [base.registryKey, 'g1to', '1500'] } });
  });

  it('falls back to a registry MsgRun with escaped literals', () => {
    const message = buildGrc20TransferMessage(base);

    expect(message.type).toBe('/vm.m_run');
    const body = message.type === '/vm.m_run' ? message.value.package.files[0].body : '';

    expect(body).toContain('grc20reg0 "gno.land/r/nt/grc20reg/v0"');
    expect(body).toContain('grc20reg0.Transfer(0, cur, "gno.land/r/demo/foo.FOO", address("g1to"), 1500); return');
    expect(body).toContain('func main(cur realm) {');
  });
});
