import {GnoProvider} from '@common/provider/gno/gno-provider';
import type {NetworkMetainfo} from '@types';

import {isAllowedOrigin, originOf} from '../browser/url-origin';

export const trimTrailingSlash = (url: string): string =>
  url.replace(/\/+$/, '');

/**
 * https only (plain http just for a local node in debug builds). A custom RPC
 * sees every address and transaction the wallet sends it, so it must not be
 * readable or replaceable on the way.
 */
export function isValidNetworkUrl(value: string): boolean {
  if (!/^\S+$/.test(value)) {
    return false;
  }
  return isAllowedOrigin(originOf(value));
}

const live = (networks: NetworkMetainfo[], exceptId?: string) =>
  networks.filter(network => !network.deleted && network.id !== exceptId);

export function existsChainId(
  chainId: string,
  networks: NetworkMetainfo[],
  exceptId?: string,
): boolean {
  return live(networks, exceptId).some(
    network => network.networkId === chainId,
  );
}

export function existsRpcUrl(
  rpcUrl: string,
  networks: NetworkMetainfo[],
  exceptId?: string,
): boolean {
  const target = trimTrailingSlash(rpcUrl);
  return live(networks, exceptId).some(
    network => trimTrailingSlash(network.rpcUrl) === target,
  );
}

export interface NetworkInput {
  name: string;
  rpcUrl: string;
  chainId: string;
  indexerUrl: string;
}

export type NetworkInputErrors = Partial<
  Record<'name' | 'rpcUrl' | 'chainId' | 'indexerUrl', string>
>;

/** The extension's add/edit checks, with https required for every URL. */
export function validateNetworkInput(
  input: NetworkInput,
  networks: NetworkMetainfo[],
  editingId?: string,
): NetworkInputErrors {
  const errors: NetworkInputErrors = {};
  if (input.name.trim() === '') {
    errors.name = 'Enter a network name';
  }
  if (!isValidNetworkUrl(input.rpcUrl)) {
    errors.rpcUrl = 'Enter an https URL';
  } else if (existsRpcUrl(input.rpcUrl, networks, editingId)) {
    errors.rpcUrl = 'RPC URL already in use';
  }
  if (input.chainId === '') {
    errors.chainId = 'Enter a chain ID';
  } else if (existsChainId(input.chainId, networks, editingId)) {
    errors.chainId = 'Chain ID already in use';
  }
  if (input.indexerUrl !== '' && !isValidNetworkUrl(input.indexerUrl)) {
    errors.indexerUrl = 'Enter an https URL';
  }
  return errors;
}

export type RpcCheck =
  | {ok: true}
  | {ok: false; reason: 'unreachable'}
  | {ok: false; reason: 'mismatch'; reported: string};

const RPC_CHECK_TIMEOUT_MS = 10_000;

/**
 * Asks the node which chain it serves. The extension saves without asking; a
 * mistyped or wrong RPC would then sign for one chain and send to another.
 */
export async function checkRpcChainId(
  rpcUrl: string,
  chainId: string,
): Promise<RpcCheck> {
  const provider = new GnoProvider(trimTrailingSlash(rpcUrl), chainId);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const status = await Promise.race([
      provider.getStatus(),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('timeout')),
          RPC_CHECK_TIMEOUT_MS,
        );
      }),
    ]);
    const reported = status?.node_info?.network ?? '';
    return reported === chainId ? {ok: true} : {ok: false, reason: 'mismatch', reported};
  } catch {
    return {ok: false, reason: 'unreachable'};
  } finally {
    clearTimeout(timer);
  }
}

export function rpcCheckMessage(check: RpcCheck): string | null {
  if (check.ok) {
    return null;
  }
  if (check.reason === 'unreachable') {
    return 'Could not reach this RPC. Check the URL and try again.';
  }
  return `This RPC serves chain "${check.reported}", not the chain ID entered.`;
}

/** Same shape as the extension's ChainService.addGnoNetwork. */
export function makeCustomNetwork(input: NetworkInput): NetworkMetainfo {
  const rpcUrl = trimTrailingSlash(input.rpcUrl);
  return {
    id: `${Date.now()}`,
    default: false,
    main: false,
    chainId: input.chainId,
    chainName: 'Gno.land',
    networkId: input.chainId,
    networkName: input.name.trim(),
    addressPrefix: 'g',
    rpcUrl,
    indexerUrl: trimTrailingSlash(input.indexerUrl),
    gnoUrl: rpcUrl,
    apiUrl: '',
    linkUrl: '',
  } as NetworkMetainfo;
}

/** The extension's edit: a repointed RPC drops the bundled fallback. */
export function applyNetworkEdit(
  origin: NetworkMetainfo,
  input: NetworkInput,
): NetworkMetainfo {
  const rpcUrl = trimTrailingSlash(input.rpcUrl);
  const name = input.name.trim();
  return {
    ...origin,
    chainId: input.chainId,
    networkId: input.chainId,
    chainName: name,
    networkName: name,
    rpcUrl,
    fallbackRPCUrl:
      rpcUrl === origin.rpcUrl ? origin.fallbackRPCUrl : undefined,
    indexerUrl: trimTrailingSlash(input.indexerUrl),
  };
}

/** Default networks are hidden rather than removed, so "reset" can bring them back. */
export function removeNetwork(
  networks: NetworkMetainfo[],
  id: string,
): NetworkMetainfo[] {
  const target = networks.find(network => network.id === id);
  if (!target) {
    return networks;
  }
  return target.default || target.id === 'teritori'
    ? networks.map(network =>
        network.id === id ? {...network, deleted: true} : network,
      )
    : networks.filter(network => network.id !== id);
}
