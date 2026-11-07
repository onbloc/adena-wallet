import {gnoLiteral} from '@common/provider/gno/qeval';
import {toRegistryKey} from '@common/utils/grc20-token-path';
import {
  getGrc20Route,
  getGrc20RouteFunc,
  GRC20_ROUTE_OP,
  resolveGrc20RouteArgs,
} from '@common/utils/grc20-route';
import {getGrc20RegConfig} from '@common/utils/grc20reg-config';
import {
  isGRC20TokenModel,
  isNativeTokenModel,
} from '@common/validation/validation-token';
import {
  createMessageOfVmCall,
  createMessageOfVmRun,
} from '@services/transaction/message/vm/vm';
import type {
  GRC20TokenModel,
  Grc20RouteMap,
  NetworkMetainfo,
  TokenModel,
} from '@types';
import BigNumber from 'bignumber.js';

import type {NetworkServices} from './services';

export {isGRC20TokenModel, isNativeTokenModel};

/**
 * The account's token list on the current network, after merging in the
 * GRC20 tokens it holds (the extension's initTokenMetainfos): new ones are
 * added as shown, the user's display choices stay.
 */
export async function syncTokenList(
  net: NetworkServices,
  accountId: string,
  address: string,
): Promise<TokenModel[]> {
  const service = net.tokenService;
  const networkId = net.network.networkId;
  const held = await discoverHeldTokens(net, address).catch(() => null);
  if (held && held.length > 0) {
    const stored = await service.getTokenMetainfosByAccountId(accountId);
    const known = new Set(
      stored
        .filter(token => token.networkId === networkId)
        .map(token => token.tokenId),
    );
    const added = held
      .filter(token => !known.has(token.tokenId))
      .map(token => ({...token, main: false, display: true}));
    if (added.length > 0) {
      await service.updateTokenMetainfosByAccountId(accountId, [
        ...stored,
        ...added,
      ]);
    }
  }
  await service.initAccountTokenMetainfos(accountId);
  return (await service.getTokenMetainfosByAccountId(accountId)).filter(
    token => token.networkId === networkId,
  );
}

/**
 * GRC20 tokens the address holds: the API server's list where the network has
 * one, else the on-chain registry crossed with the indexer's transfer events.
 */
async function discoverHeldTokens(
  net: NetworkServices,
  address: string,
): Promise<GRC20TokenModel[]> {
  const service = net.tokenService;
  const fromApi = await service
    .fetchAccountGRC20Tokens(address)
    .catch(() => null);
  if (fromApi) {
    return fromApi;
  }
  const [registered, transferred] = await Promise.all([
    service.fetchGRC20Tokens().catch((): GRC20TokenModel[] => []),
    service
      .fetchAllTransferGRC20TokenPathsBy(address)
      .catch((): string[] => []),
  ]);
  return registered.filter(token => transferred.includes(token.tokenId));
}

export async function setTokenDisplay(
  net: NetworkServices,
  accountId: string,
  tokenId: string,
  display: boolean,
): Promise<void> {
  await net.tokenService.changeAccountTokenMetainfoDisplay(
    accountId,
    tokenId,
    display,
  );
}

/** Adds a registry token to the account's list, shown. */
export async function addToken(
  net: NetworkServices,
  accountId: string,
  token: GRC20TokenModel,
): Promise<void> {
  const service = net.tokenService;
  const stored = await service.getTokenMetainfosByAccountId(accountId);
  if (
    stored.some(
      item => item.tokenId === token.tokenId && item.networkId === token.networkId,
    )
  ) {
    await setTokenDisplay(net, accountId, token.tokenId, true);
    return;
  }
  await service.updateTokenMetainfosByAccountId(accountId, [
    ...stored,
    {...token, main: false, display: true},
  ]);
}

export interface TokenBalance {
  token: TokenModel;
  /** In the token's smallest unit; null when it could not be read. */
  raw: string | null;
}

/** Balances for a token list; GRC20 ones in one batched registry query. */
export async function fetchTokenBalances(
  net: NetworkServices,
  address: string,
  tokens: TokenModel[],
): Promise<TokenBalance[]> {
  const grc20Paths = tokens.filter(isGRC20TokenModel).map(token => token.tokenId);
  const grc20 = grc20Paths.length
    ? await net.balanceService
        .getGRC20TokenBalanceMap(address, grc20Paths)
        .catch(() => ({} as Record<string, bigint>))
    : ({} as Record<string, bigint>);
  return Promise.all(
    tokens.map(async token => {
      if (isGRC20TokenModel(token)) {
        const raw = grc20[token.tokenId];
        return {token, raw: raw === undefined ? null : raw.toString()};
      }
      if (isNativeTokenModel(token)) {
        const gnot = await net.balanceService
          .getGnotTokenBalance(address)
          .catch(() => null);
        return {
          token,
          raw:
            gnot === null
              ? null
              : BigNumber(gnot).shiftedBy(token.decimals).toFixed(0),
        };
      }
      return {token, raw: null};
    }),
  );
}

/** A raw amount as a display string in whole tokens, e.g. "1,234.5". */
export function formatTokenAmount(raw: string | null, decimals: number): string {
  if (raw === null) {
    return '-';
  }
  return BigNumber(raw).shiftedBy(-decimals).toFormat();
}

/**
 * A typed amount in the token's smallest unit, or null when it is not a
 * positive number with at most `decimals` decimals. Exact: the extension's
 * Math.round(...toNumber()) loses precision above 2^53.
 */
export function parseTokenAmount(input: string, decimals: number): string | null {
  const value = input.trim();
  if (!/^\d+(\.\d+)?$/.test(value)) {
    return null;
  }
  const amount = BigNumber(value);
  if (!amount.isFinite() || amount.lte(0) || (amount.decimalPlaces() ?? 0) > decimals) {
    return null;
  }
  return amount.shiftedBy(decimals).toFixed(0);
}

/**
 * The extension's GRC20 transfer message, in its order of preference: the
 * token's published `routes` transfer function on its own realm, the chain's
 * helper realm, then a MsgRun through the registry's Transfer.
 */
export function grc20TransferMessage(params: {
  token: GRC20TokenModel;
  from: string;
  to: string;
  rawAmount: string;
  network: NetworkMetainfo;
  routes: Grc20RouteMap;
}) {
  const {token, from, to, rawAmount, network, routes} = params;
  const registryKey = toRegistryKey(token.tokenId) ?? token.pkgPath;
  const routeFunc = getGrc20RouteFunc(
    getGrc20Route(routes, registryKey),
    GRC20_ROUTE_OP.TRANSFER,
  );
  if (routeFunc) {
    const args = resolveGrc20RouteArgs(routeFunc, {to, amount: rawAmount});
    if (args) {
      return createMessageOfVmCall({
        caller: from,
        send: '',
        max_deposit: '',
        pkgPath: token.pkgPath,
        func: routeFunc.name,
        args,
      });
    }
  }

  const config = getGrc20RegConfig(network.chainId);
  if (config.helperPath) {
    return createMessageOfVmCall({
      caller: from,
      send: '',
      max_deposit: '',
      pkgPath: config.helperPath,
      func: 'Transfer',
      args: [registryKey, to, rawAmount],
    });
  }

  const aliases = config.registries.map((registry, index) => ({
    alias: `grc20reg${index}`,
    path: registry.path,
  }));
  const body = [
    'package main',
    '',
    'import (',
    ...aliases.map(({alias, path}) => `\t${alias} ${gnoLiteral(path)}`),
    ')',
    '',
    'func main(cur realm) {',
    ...aliases.map(
      ({alias}) =>
        `\tif ${alias}.Get(${gnoLiteral(
          registryKey,
        )}) != nil { ${alias}.Transfer(0, cur, ${gnoLiteral(
          registryKey,
        )}, address(${gnoLiteral(to)}), ${rawAmount}); return }`,
    ),
    `\tpanic("token is not registered: " + ${gnoLiteral(registryKey)})`,
    '}',
    '',
  ].join('\n');
  return createMessageOfVmRun({
    caller: from,
    send: '',
    max_deposit: '',
    packageInfo: {
      name: 'main',
      path: '',
      files: [{name: 'main.gno', body}],
    },
  });
}
