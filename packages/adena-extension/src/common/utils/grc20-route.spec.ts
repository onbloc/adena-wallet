import {
  getGrc20Route,
  getGrc20RouteFunc,
  GRC20_ROUTE_OP,
  parseGrc20Route,
  resolveGrc20RouteArgs,
} from './grc20-route';

const CANONICAL_TRANSFER = { name: 'Transfer', args: ['$to', '$amount'] };

describe('resolveGrc20RouteArgs', () => {
  it('substitutes placeholders in declaration order', () => {
    expect(resolveGrc20RouteArgs(CANONICAL_TRANSFER, { to: 'g1to', amount: '100' })).toEqual([
      'g1to',
      '100',
    ]);
  });

  it('passes a leading literal through, as a factory realm needs', () => {
    const routeFunc = { name: 'Transfer', args: ['FOO', '$to', '$amount'] };

    expect(resolveGrc20RouteArgs(routeFunc, { to: 'g1to', amount: '100' })).toEqual([
      'FOO',
      'g1to',
      '100',
    ]);
  });

  it('keeps a literal that is not in the leading position', () => {
    const routeFunc = { name: 'Transfer', args: ['$to', '$amount', 'FOO'] };

    expect(resolveGrc20RouteArgs(routeFunc, { to: 'g1to', amount: '100' })).toEqual([
      'g1to',
      '100',
      'FOO',
    ]);
  });

  it('unescapes a literal that starts with $', () => {
    const routeFunc = { name: 'Transfer', args: ['$$to', '$to', '$amount'] };

    expect(resolveGrc20RouteArgs(routeFunc, { to: 'g1to', amount: '100' })).toEqual([
      '$to',
      'g1to',
      '100',
    ]);
  });

  it('rejects an unknown placeholder instead of treating it as a literal', () => {
    const routeFunc = { name: 'Transfer', args: ['$reciever', '$amount'] };

    expect(resolveGrc20RouteArgs(routeFunc, { to: 'g1to', amount: '100' })).toBeNull();
  });

  it('rejects a placeholder with no value supplied', () => {
    expect(resolveGrc20RouteArgs(CANONICAL_TRANSFER, { amount: '100' })).toBeNull();
  });

  it('resolves the transfer_from shape', () => {
    const routeFunc = { name: 'TransferFrom', args: ['$from', '$to', '$amount'] };

    expect(resolveGrc20RouteArgs(routeFunc, { from: 'g1from', to: 'g1to', amount: '100' })).toEqual(
      ['g1from', 'g1to', '100'],
    );
  });
});

describe('parseGrc20Route', () => {
  it('parses a canonical route', () => {
    const route = parseGrc20Route({
      funcs: {
        transfer: CANONICAL_TRANSFER,
        approve: { name: 'Approve', args: ['$spender', '$amount'] },
      },
    });

    expect(route?.funcs.transfer).toEqual(CANONICAL_TRANSFER);
    expect(route?.funcs.approve?.name).toBe('Approve');
  });

  it('keeps an empty funcs, which declares a realm with no user-callable writes', () => {
    expect(parseGrc20Route({ funcs: {} })).toEqual({ funcs: {} });
  });

  it('returns null when routes is absent, so the consumer falls back', () => {
    expect(parseGrc20Route(undefined)).toBeNull();
    expect(parseGrc20Route({})).toBeNull();
  });

  it('drops a malformed operation without discarding the rest', () => {
    const route = parseGrc20Route({
      funcs: {
        transfer: CANONICAL_TRANSFER,
        approve: { name: 'approve', args: ['$spender', '$amount'] },
        transfer_from: { name: 'TransferFrom', args: ['$from', 1, '$amount'] },
      },
    });

    expect(Object.keys(route?.funcs ?? {})).toEqual(['transfer']);
  });
});

describe('getGrc20Route / getGrc20RouteFunc', () => {
  const routes = {
    'gno.land/r/gnoland/wugnot.wugnot': { funcs: { transfer: CANONICAL_TRANSFER } },
  };

  it('looks a route up by registry key', () => {
    expect(getGrc20Route(routes, 'gno.land/r/gnoland/wugnot.wugnot')?.funcs.transfer).toEqual(
      CANONICAL_TRANSFER,
    );
  });

  it('returns null for an unpublished token', () => {
    expect(getGrc20Route(routes, 'gno.land/r/demo/foo.FOO')).toBeNull();
    expect(getGrc20Route(undefined, 'gno.land/r/gnoland/wugnot.wugnot')).toBeNull();
  });

  it('returns null for an operation the realm does not expose', () => {
    expect(getGrc20RouteFunc({ funcs: {} }, GRC20_ROUTE_OP.TRANSFER)).toBeNull();
  });
});
