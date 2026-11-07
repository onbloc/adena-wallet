import type {
  GRC20TokenModel,
  NetworkMetainfo,
  TokenModel,
} from '@types';

import type {NetworkServices} from '../../src/core/services';
import {
  addToken,
  fetchTokenBalances,
  formatTokenAmount,
  grc20TransferMessage,
  parseTokenAmount,
  syncTokenList,
} from '../../src/core/tokens';

const gnot: TokenModel = {
  main: true,
  tokenId: 'gnot',
  networkId: 'test-1',
  display: true,
  type: 'gno-native',
  name: 'Gnoland',
  symbol: 'GNOT',
  decimals: 6,
  image: '',
};

const grc20 = (
  symbol: string,
  over: Partial<GRC20TokenModel> = {},
): GRC20TokenModel => ({
  main: false,
  tokenId: `gno.land/r/demo/${symbol.toLowerCase()}.${symbol}`,
  networkId: 'test-1',
  display: true,
  type: 'grc20',
  name: symbol,
  symbol,
  decimals: 6,
  image: '',
  pkgPath: `gno.land/r/demo/${symbol.toLowerCase()}`,
  ...over,
});

/** A token service backed by one in-memory list, like ACCOUNT_TOKEN_METAINFOS. */
function fakeNet(options: {held: GRC20TokenModel[] | null; stored: TokenModel[]}) {
  let stored = options.stored;
  const tokenService = {
    fetchAccountGRC20Tokens: async () => options.held,
    fetchGRC20Tokens: async () => [],
    fetchAllTransferGRC20TokenPathsBy: async () => [],
    getTokenMetainfosByAccountId: async () => stored,
    updateTokenMetainfosByAccountId: async (_: string, next: TokenModel[]) => {
      stored = next;
      return true;
    },
    initAccountTokenMetainfos: async () => {
      if (!stored.some(token => token.tokenId === 'gnot')) {
        stored = [gnot, ...stored];
      }
      return true;
    },
    changeAccountTokenMetainfoDisplay: async (
      _: string,
      tokenId: string,
      display: boolean,
    ) => {
      stored = stored.map(token =>
        token.tokenId === tokenId ? {...token, display} : token,
      );
      return true;
    },
  };
  const balanceService = {
    getGnotTokenBalance: async () => 1.5,
    getGRC20TokenBalanceMap: async (_: string, paths: string[]) =>
      Object.fromEntries(paths.map(path => [path, 123456789n])),
  };
  return {
    net: {
      network: {networkId: 'test-1', chainId: 'test-1'},
      tokenService,
      balanceService,
    } as unknown as NetworkServices,
    stored: () => stored,
  };
}

describe('token list', () => {
  it('adds held tokens as shown and keeps hidden ones hidden', async () => {
    const hidden = grc20('FOO', {display: false});
    const {net} = fakeNet({held: [hidden, grc20('BAR')], stored: [hidden]});
    const list = await syncTokenList(net, 'acc', 'g1me');
    expect(list.map(token => [token.symbol, token.display])).toEqual([
      ['GNOT', true],
      ['FOO', false],
      ['BAR', true],
    ]);
  });

  it('only lists tokens of the current network', async () => {
    const other = grc20('OTH', {networkId: 'other-1'});
    const {net} = fakeNet({held: null, stored: [other]});
    const list = await syncTokenList(net, 'acc', 'g1me');
    expect(list.map(token => token.symbol)).toEqual(['GNOT']);
  });

  it('shows an added token again instead of adding it twice', async () => {
    const token = grc20('FOO', {display: false});
    const {net, stored} = fakeNet({held: null, stored: [token]});
    await addToken(net, 'acc', grc20('FOO'));
    expect(stored()).toEqual([{...token, display: true}]);
  });

  it('reads balances in the smallest unit', async () => {
    const {net} = fakeNet({held: null, stored: []});
    const read = await fetchTokenBalances(net, 'g1me', [gnot, grc20('FOO')]);
    expect(read.map(item => item.raw)).toEqual(['1500000', '123456789']);
  });
});

describe('amounts', () => {
  it('formats raw amounts with the token decimals', () => {
    expect(formatTokenAmount('123456789', 6)).toBe('123.456789');
    expect(formatTokenAmount(null, 6)).toBe('-');
  });

  it('parses typed amounts exactly, beyond 2^53', () => {
    expect(parseTokenAmount('1.5', 6)).toBe('1500000');
    expect(parseTokenAmount('12345678901234.123456', 6)).toBe(
      '12345678901234123456',
    );
  });

  it.each(['0', '-1', '1.1234567', 'abc', '1e3', ''])('refuses %s', value => {
    expect(parseTokenAmount(value, 6)).toBeNull();
  });
});

describe('grc20TransferMessage', () => {
  const token = grc20('FOO');
  const base = {
    token,
    from: 'g1from',
    to: 'g1to',
    rawAmount: '1500000',
  };

  it('calls the transfer route a token publishes', () => {
    const message = grc20TransferMessage({
      ...base,
      network: {chainId: 'test-1'} as NetworkMetainfo,
      routes: {
        [token.tokenId]: {
          funcs: {transfer: {name: 'Transfer', args: ['$to', '$amount']}},
        },
      } as any,
    });
    expect(message).toEqual({
      type: '/vm.m_call',
      value: {
        caller: 'g1from',
        send: '',
        max_deposit: '',
        pkg_path: token.pkgPath,
        func: 'Transfer',
        args: ['g1to', '1500000'],
      },
    });
  });

  it('falls back to a script through the registry, with values quoted', () => {
    const message = grc20TransferMessage({
      ...base,
      network: {chainId: 'test-1'} as NetworkMetainfo,
      routes: {},
    }) as any;
    expect(message.type).toBe('/vm.m_run');
    const body: string = message.value.package.files[0].body;
    expect(body).toContain('package main');
    expect(body).toContain(`address("g1to"), 1500000)`);
    expect(body).toContain(`Get("${token.tokenId}")`);
  });
});
