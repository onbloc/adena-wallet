import { buildGrc20TransferMessage, resolveRouteArgs } from '../../../../../src/repositories/chain/gno/gno-grc20-transfer';
import { getGrc20RegistryConfig } from '../../../../../src/resources';

const config = getGrc20RegistryConfig('gnoland-1');
const base = {
  caller: 'g1caller',
  registryKey: 'gno.land/r/demo/foo.FOO',
  pkgPath: 'gno.land/r/demo/foo',
  toAddress: 'g1to',
  amount: '1500',
  config,
};

const runBody = (message: ReturnType<typeof buildGrc20TransferMessage>): string =>
  message.type === '/vm.m_run' ? message.value.package.files[0].body : '';

describe('resolveRouteArgs', () => {
  it('substitutes every supported placeholder', () => {
    const route = { name: 'TransferFrom', args: ['$from', '$to', '$spender', '$owner', '$amount'] };

    expect(resolveRouteArgs(route, { from: 'f', to: 't', spender: 's', owner: 'o', amount: '1' })).toEqual(['f', 't', 's', 'o', '1']);
  });

  it('keeps literals and unescapes $$', () => {
    expect(resolveRouteArgs({ name: 'T', args: ['literal', '$$to', ''] }, {})).toEqual(['literal', '$to', '']);
    expect(resolveRouteArgs({ name: 'T', args: [] }, {})).toEqual([]);
  });

  it('aborts on unknown, missing or empty placeholders', () => {
    expect(resolveRouteArgs({ name: 'T', args: ['$recipient'] }, { recipient: 'x' } as never)).toBeNull();
    expect(resolveRouteArgs({ name: 'T', args: ['$to'] }, {})).toBeNull();
    expect(resolveRouteArgs({ name: 'T', args: ['$amount'] }, { amount: '' })).toBeNull();
    expect(resolveRouteArgs({ name: 'T', args: ['$'] }, { to: 'x' })).toBeNull();
  });
});

describe('buildGrc20TransferMessage', () => {
  it('uses a resolvable token route on the token package', () => {
    expect(buildGrc20TransferMessage({ ...base, route: { name: 'Transfer', args: ['$to', '$amount'] } })).toEqual({
      type: '/vm.m_call',
      value: { caller: 'g1caller', send: '', max_deposit: '', pkg_path: 'gno.land/r/demo/foo', func: 'Transfer', args: ['g1to', '1500'] },
    });
  });

  it('skips an unresolvable route', () => {
    expect(buildGrc20TransferMessage({ ...base, route: { name: 'Transfer', args: ['$owner'] } }).type).toBe('/vm.m_run');
    expect(buildGrc20TransferMessage({ ...base, route: { name: 'Transfer', args: ['$owner'] }, config: { ...config, helperPath: 'gno.land/r/helper' } }))
      .toMatchObject({ type: '/vm.m_call', value: { pkg_path: 'gno.land/r/helper', func: 'Transfer' } });
  });

  it('falls back to the helper realm', () => {
    expect(buildGrc20TransferMessage({ ...base, config: { ...config, helperPath: 'gno.land/r/helper' } })).toEqual({
      type: '/vm.m_call',
      value: { caller: 'g1caller', send: '', max_deposit: '', pkg_path: 'gno.land/r/helper', func: 'Transfer', args: [base.registryKey, 'g1to', '1500'] },
    });
  });

  it('builds a MsgRun that tries every registry in order', () => {
    const message = buildGrc20TransferMessage({ ...base, config: { ...config, registries: [{ path: 'gno.land/r/a/reg' }, { path: 'gno.land/r/b/reg' }] } });
    const body = runBody(message);

    expect(message).toMatchObject({ type: '/vm.m_run', value: { caller: 'g1caller', send: '', max_deposit: '', package: { name: 'main', path: '' } } });
    expect(message.type === '/vm.m_run' && message.value.package.files.map(file => file.name)).toEqual(['main.gno']);
    expect(body).toContain('\tgrc20reg0 "gno.land/r/a/reg"\n\tgrc20reg1 "gno.land/r/b/reg"');
    expect(body.indexOf('grc20reg0.Transfer(')).toBeLessThan(body.indexOf('grc20reg1.Transfer('));
    expect(body).toContain('panic("token is not registered: " + "gno.land/r/demo/foo.FOO")');
    expect(body.startsWith('package main\n')).toBe(true);
  });

  it('escapes user-controlled values in the MsgRun body', () => {
    const body = runBody(buildGrc20TransferMessage({ ...base, toAddress: 'g1"); panic("x', registryKey: 'k"\n' }));

    expect(body).toContain('address("g1\\"); panic(\\"x")');
    expect(body).toContain('Get("k\\"\\n")');
  });

  it('keeps huge amounts as integer literals', () => {
    expect(runBody(buildGrc20TransferMessage({ ...base, amount: '123456789012345678901234567890' }))).toContain(', 123456789012345678901234567890); return');
  });
});
